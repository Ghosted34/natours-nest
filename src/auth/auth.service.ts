import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  AuthRequest,
  ChangePwdDTO,
  JwtPayload,
  LoginDTO,
  RegisterDTO,
  ResetPwdDTO,
  Role,
} from './dto';
import { hash, verify } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';

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

  async generateJWTToken({
    id,
    email,
    role,
    verified,
    type,
  }: {
    id: string;
    email: string;
    role: Role;
    verified: boolean;
    type?: 'reset' | 'verify';
  }) {
    const payload = {
      sub: id,
      email,
      role,
      verified,
      type: type || undefined,
    };
    const expiry = type === 'reset' ? 'RESET_EXPIRES' : 'VERIFY_EXPIRES';
    const secret = type === 'reset' ? 'RESET_SECRET' : 'VERIFY_SECRET';

    return this.jwt.signAsync(payload, {
      expiresIn: this.cfg.get(expiry),
      secret: this.cfg.get(secret),
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
      data: { ...dto, password: hashed },
    });

    delete user.password;

    //create verificatioin jwt

    const verify_token = await this.generateJWTToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      verified: user.isVerified,
    });

    //  send email link

    await this.email.sendVerificationEmail(user.email, {
      firstName: user.firstName,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verify_token}`,
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

    const payload = (await this.jwt.verifyAsync(token, {
      secret: this.cfg.get('VERIFY_SECRET'),
    })) as unknown as JwtPayload;

    if (!payload || !payload.sub) {
      throw new ForbiddenException('Invalid token');
    }

    const cached = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (cached.isVerified)
      throw new ConflictException('User is already Verified');

    if (payload.exp < Date.now() / 1000) {
      throw new ForbiddenException('Token is expired');
    }

    const user = await this.prisma.user.update({
      where: { id: payload.sub },
      data: { isVerified: true },
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

  async resend_verify(email: string) {
    if (!email) {
      throw new ForbiddenException('No token provided');
    }

    const cached = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!cached) throw new NotFoundException('User does not exist');

    //if verified, do not resend

    if (cached.isVerified) {
      throw new ConflictException('User is already verified');
    }

    const verify_token = await this.generateJWTToken({
      id: cached.id,
      email: cached.email,
      role: cached.role as Role,
      verified: cached.isVerified,
    });

    //  send email link

    await this.email.sendVerificationEmail(cached.email, {
      firstName: cached.firstName,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verify_token}`,
    });

    return {
      message: 'Verification Mail Sent',
      status: 'success',
      data: null,
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

  async forgotPassword(email: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const reset_token = await this.generateJWTToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      verified: user.isVerified,
      type: 'reset',
    });

    //send to mail

    await this.email.sendPasswordResetEmail(
      email,
      `${process.env.FRONTEND_URL}/reset-password?token=${reset_token}`,
      user.firstName,
    );
    return {
      message: 'Password reset email sent',
      status: 'success',
    };
  }

  async resetPassword(dto: ResetPwdDTO) {
    const { token, password } = dto;

    const isBlacklisted = await this.redis.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new ForbiddenException('Reset link expired or already used');
    }

    const payload = (await this.jwt.verifyAsync(token, {
      secret: this.cfg.get('RESET_SECRET'),
    })) as unknown as JwtPayload;

    if (!payload || !payload.sub || payload.type !== 'reset') {
      throw new ForbiddenException('Invalid token');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new ForbiddenException('Token is expired');
    }

    // Hash new password and update user
    const hashedPassword = await hash(password);

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword },
    });

    await this.redis.blacklistToken(token, payload.exp);

    return {
      message: 'Password reset successfully. Log in Again.',
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
      data: { password: hashedPassword },
    });

    ///force to login in again
    await this.redis.blacklistAllUserTokens(id);
    return {
      message: 'Password reset successfully',
      status: 'success',
    };
  }
}
