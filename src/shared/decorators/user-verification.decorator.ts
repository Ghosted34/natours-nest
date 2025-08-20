import { SetMetadata } from '@nestjs/common';

export const AUTH_REQUIREMENTS = 'authRequirements';

export const RequireVerified = () =>
  SetMetadata(AUTH_REQUIREMENTS, {
    requireVerified: true,
  });
