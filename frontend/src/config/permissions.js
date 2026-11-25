// Espelho dos padrões de permissão do backend (backend/src/config/permissions.js).
// Usado só enquanto a sessão ainda não trouxe as permissões efetivas do usuário (GET /auth/me).
const ALL_STAFF = ['admin', 'technician', 'attendant'];
export const ROLE_DEFAULTS = {
  'orders.manage': ALL_STAFF,
  'orders.delete': ['admin'],
  'sales.create': ALL_STAFF,
  'sales.refund': ['admin'],
  'cash.close': ['admin'],
  'catalog.edit': ['admin', 'attendant'],
  'catalog.delete': ['admin'],
  'suppliers.edit': ['admin', 'attendant'],
  'costs.view': ['admin'],
  'metrics.view': ['admin'],
  'goals.edit': ['admin'],
  'users.manage': ['admin'],
  'settings.manage': ['admin'],
};

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
  return (ROLE_DEFAULTS[permission] || []).includes(user.role);
}
