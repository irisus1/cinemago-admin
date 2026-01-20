export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = keyof typeof ROLES;

export const PERMISSIONS = {
  VIEW_CINEMA_SELECTOR: [ROLES.MANAGER, ROLES.EMPLOYEE],
  ACCESS_ADMIN_DASHBOARD: [ROLES.ADMIN],
  ACCESS_MANAGER_DASHBOARD: [ROLES.MANAGER],
  ACCESS_TICKET_SALES: [ROLES.EMPLOYEE],
};

export const ROLE_REDIRECTS = {
  [ROLES.EMPLOYEE]: "/admin/ticket",
  [ROLES.MANAGER]: "/admin/manager-dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
};

/**
 * @param userRole
 * @param allowedRoles
 */
export const hasPermission = (
  userRole: string | undefined,
  allowedRoles: readonly string[],
) => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};
