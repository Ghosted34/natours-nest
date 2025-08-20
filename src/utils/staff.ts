import { Role } from 'src/auth/dto';

export const generateEmployeeId = ({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}): string => {
  return `EMP-${firstName}.${lastName}-${Date.now().toString()}`;
};

export const setDefaultPermissions = (role: Role): string[] => {
  switch (role) {
    case Role.admin:
      return ['create_staff', 'manage_users', 'view_all_data', 'system_config'];
    case Role.lead_guide:
      return ['manage_guides', 'view_reports', 'schedule_tours'];
    case Role.guide:
      return ['view_schedule', 'update_profile'];
    default:
      return [];
  }
};
