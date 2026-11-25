// O admin tem todas as permissões; o user só as que o admin marcou (vêm em user.permissions).
// 'admin' como permissão = telas exclusivas do admin (Central do Administrador).
export function hasPermission(user, permission) {
  if (!user || user.role === 'superadmin') return false;
  if (user.role === 'admin') return true;
  if (permission === 'admin') return false;
  return (user.permissions || []).includes(permission);
}
