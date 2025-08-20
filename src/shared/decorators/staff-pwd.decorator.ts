import { SetMetadata } from '@nestjs/common';
export const REQUIRE_PASSWORD_CHANGE = 'requirePasswordChange';
export const RequirePasswordChange = () =>
  SetMetadata(REQUIRE_PASSWORD_CHANGE, true);
