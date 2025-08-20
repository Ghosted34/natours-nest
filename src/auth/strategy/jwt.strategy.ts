import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, Role } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';

@Injectable({})
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get('ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<any> {
    // how to access id after validate to use in retrieving profile in user service

    const token = req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    const isTokenBlacklisted =
      await this.redisService.isTokenBlacklisted(token);
    if (isTokenBlacklisted) {
      throw new UnauthorizedException('Access has been revoked');
    }

    const areUserTokensBlacklisted =
      await this.redisService.areUserTokensBlacklisted(payload.sub);
    if (areUserTokensBlacklisted) {
      throw new UnauthorizedException(
        'Access on all devices have been revoked',
      );
    }

    const cached =
      payload.role === Role.user
        ? await this.prisma.user.findUnique({
            where: { id: payload.sub },
          })
        : await this.prisma.staff.findUnique({
            where: { id: payload.sub },
          });

    if (!cached) {
      throw new NotFoundException('User Not Found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isVerified: payload.verified || false, // Ensure isVerified is set
    };
  }
}
