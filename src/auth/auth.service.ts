import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  AuthRequest,
  ChangePwdDTO,
  JwtPayload,
  LoginDTO,
  RegisterDTO,
  Role,
} from './dto';
import { hash, verify } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';
import { generateToken } from 'src/utils/otp';
import { createHash } from 'crypto';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
    private email: EmailService,
    private redis: RedisService,
  ) {}

  async generateAccessToken({
    id,
    email,
    role,
    verified,
  }: {
    id: string;
    email: string;
    role: Role;
    verified: boolean;
  }) {
    const payload = {
      sub: id,
      email,
      role,
      verified,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: this.cfg.get('ACCESS_EXPIRES'),
      secret: this.cfg.get('ACCESS_SECRET'),
    });
  }

  async generateRefreshToken({
    id,
    email,
    role,
    verified,
  }: {
    id: string;
    email: string;
    role: Role;
    verified: boolean;
  }) {
    const payload = {
      sub: id,
      email,
      role,
      verified,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: this.cfg.get('REFRESH_EXPIRES'),
      secret: this.cfg.get('REFRESH_SECRET'),
    });
  }
  async register(dto: RegisterDTO) {
    //   hash

    // check if email exists

    const emailExists = Boolean(
      await this.prisma.user.findUnique({
        where: { email: dto.email },
      }),
    );

    if (emailExists) {
      throw new ForbiddenException('Email is taken');
    }

    // check if usernme is taken

    const usernameExists = Boolean(
      await this.prisma.user.findUnique({
        where: { email: dto.email },
      }),
    );

    if (usernameExists) {
      throw new ForbiddenException('Username is taken');
    }

    const hashed = await hash(dto.password);

    //   save
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed, verificationToken: generateToken() },
    });

    delete user.password;

    //  send email link

    await this.email.sendVerificationEmail(user.email, {
      firstName: user.firstName,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${user.verificationToken}`,
    });

    return {
      data: {
        ...user,
        access_token: await this.generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role as Role,
          verified: user.isVerified,
        }),
        refresh_token: await this.generateRefreshToken({
          id: user.id,
          email: user.email,
          role: user.role as Role,
          verified: user.isVerified,
        }),
      },
      message: 'Verify your email to activate your account.',
      status: 'success',
    };
  }

  async signin(dto: LoginDTO) {
    // //   find user by email;

    const cached =
      dto.role === Role.user
        ? await this.prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: dto.emailOrUsername, mode: 'insensitive' } },
                {
                  username: {
                    equals: dto.emailOrUsername,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          })
        : await this.prisma.staff.findUnique({
            where: { email: dto.emailOrUsername },
          });

    if (!cached) throw new ForbiddenException('User does not exist');

    // //   compare hash

    const pwdMatches = await verify(cached.password, dto.password);

    // if incorrect return error
    if (!pwdMatches)
      throw new ForbiddenException('Email/Username or Password Incorrect');

    delete cached.password;
    // //   return user

    return {
      data: {
        ...cached,
        access_token: await this.generateAccessToken({
          id: cached.id,
          email: cached.email,
          role: cached.role as Role,
          verified: 'isVerified' in cached && cached.isVerified,
        }),
        refresh_token: await this.generateRefreshToken({
          id: cached.id,
          email: cached.email,
          role: cached.role as Role,
          verified: 'isVerified' in cached && cached.isVerified,
        }),
      },
      status: 'success',
    };
  }

  async verify(token: string) {
    if (!token) {
      throw new ForbiddenException('No token provided');
    }

    const cached = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!cached)
      throw new ForbiddenException('Invalid or expired verification token');

    const user = await this.prisma.user.update({
      where: { id: cached.id },
      data: { isVerified: true, verificationToken: null },
    });

    return {
      message: 'Email verified successfully',
      status: 'success',
      data: {
        ...user,
        access_token: await this.generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role as Role,
          verified: 'isVerified' in user && user.isVerified,
        }),
        refresh_token: await this.generateRefreshToken({
          id: user.id,
          email: user.email,
          role: user.role as Role,
          verified: 'isVerified' in user && user.isVerified,
        }),
      },
    };
  }

  async logout(req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log(token, req.headers.authorization);

    if (!token) {
      throw new ForbiddenException('No token provided');
    }
    await this.redis.blacklistToken(token, 1 * 60 * 60);

    const { refreshToken } = req.body as { refreshToken?: string };

    if (refreshToken) {
      await this.redis.blacklistToken(refreshToken, 1 * 24 * 60 * 60); // 1 day
    }
  }

  async logoutAll(req: AuthRequest) {
    await this.redis.blacklistAllUserTokens(req.user.id);
  }

  async refreshToken(token: string) {
    const isRevoked = await this.redis.isTokenBlacklisted(token);

    if (isRevoked) {
      throw new ForbiddenException('Token is revoked');
    }

    const payload = (await this.jwt.verifyAsync(token, {
      secret: this.cfg.get('REFRESH_SECRET'),
    })) as unknown as JwtPayload;

    if (!payload || !payload.sub) {
      throw new ForbiddenException('Invalid token');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new ForbiddenException('Token is expired');
    }
    const { sub, email, role, verified } = payload;

    return {
      data: {
        access_token: await this.generateAccessToken({
          id: sub,
          email,
          role,
          verified,
        }),
      },
      message: 'Token refreshed successfully',
      status: 'success',
    };
  }

  async forgotPassword(req: Request) {
    const { email } = req.body as { email: string };

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ForbiddenException('User does not exist');
    }

    // generate reset token and save to user

    const fPwdToken = createHash('sha256')
      .update(generateToken())
      .digest('hex');

    await this.prisma.user.update({
      where: { email },
      data: { resetToken: fPwdToken },
    });

    //send to mail

    await this.email.sendPasswordResetEmail(
      email,
      `${process.env.FRONTEND_URL}/reset-password?token=${user.resetToken}`,
      user.firstName,
    );
    return {
      message: 'Password reset email sent',
      status: 'success',
    };
  }

  async resetPassword(req: Request) {
    const { token, password } = req.body as { token: string; password: string };

    // Find user by reset token
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    // Hash new password and update user
    const hashedPassword = await hash(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null },
    });

    return {
      message: 'Password reset successfully',
      status: 'success',
    };
  }

  async changePassword({ dto, id }: { dto: ChangePwdDTO; id: string }) {
    const { newPwd } = dto;

    const cached = await this.prisma.user.findUnique({
      where: { id },
      select: { password: true },
    });

    if (!cached) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    // Hash new password and update user
    const hashedPassword = await hash(newPwd);
    await this.prisma.user.update({
      where: { id: id },
      data: { password: hashedPassword, resetToken: null },
    });

    ///force to login in again
    await this.redis.blacklistAllUserTokens(id);
    return {
      message: 'Password reset successfully',
      status: 'success',
    };
  }
}
