// guards/user-verification.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRequest } from 'src/auth/dto';
import { AUTH_REQUIREMENTS } from '../decorators';

@Injectable()
export class UserVerificationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request: AuthRequest = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const requireVerified = this.reflector.get<boolean>(
      AUTH_REQUIREMENTS,
      context.getHandler(),
    );

    // Check if user is verified
    if (requireVerified && !user.isVerified) {
      throw new ForbiddenException(
        'Please verify your account to access this resource',
      );
    }

    return true;
  }
}
