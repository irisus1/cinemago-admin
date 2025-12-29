export const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = keyof typeof ROLES;

// Feature flags / permissions
export const PERMISSIONS = {
    VIEW_CINEMA_SELECTOR: [ROLES.MANAGER, ROLES.EMPLOYEE],
    ACCESS_ADMIN_DASHBOARD: [ROLES.ADMIN],
    ACCESS_MANAGER_DASHBOARD: [ROLES.MANAGER],
    ACCESS_TICKET_SALES: [ROLES.EMPLOYEE],
};

// Redirect paths after login
export const ROLE_REDIRECTS = {
    [ROLES.EMPLOYEE]: "/admin/ticket",
    [ROLES.MANAGER]: "/admin/manager-dashboard",
    [ROLES.ADMIN]: "/admin/dashboard",
};

/**
 * Checks if a user role has specific permission or belongs to allowed roles.
 * @param userRole - The role of the current user
 * @param allowedRoles - Array of roles that are allowed
 */
export const hasPermission = (userRole: string | undefined, allowedRoles: readonly string[]) => {
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
};
