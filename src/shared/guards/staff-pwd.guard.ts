import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PASSWORD_CHANGE } from '../decorators';

@Injectable()
export class StaffPasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const requirePwdChange = this.reflector.get<boolean>(
      REQUIRE_PASSWORD_CHANGE,
      context.getHandler(),
    );
    // Check if this is a staff member with unchanged password
    if (
      requirePwdChange &&
      ['lead_guide', 'guide'].includes(user.role) &&
      !user.hasPwdChanged
    ) {
      throw new ForbiddenException(
        'Please change your temporary password to access this resource',
      );
    }

    return true;
  }
}
