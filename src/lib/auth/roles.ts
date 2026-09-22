export const ADMIN_ROLES = new Set(['ADMIN', 'SUPPORT', 'DEVELOPER']);

export function hasAdminAccess({
  role,
  isAdmin,
}: {
  role?: string | null;
  isAdmin?: boolean | null;
}) {
  if (isAdmin) return true;
  if (!role) return false;
  return ADMIN_ROLES.has(role);
}
