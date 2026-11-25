// Permissões do sistema. Cada perfil tem um conjunto padrão; o administrador pode
// liberar ou bloquear permissões por usuário (User.permission_overrides).
// O perfil "owner" (dona do sistema) tem sempre todas as permissões.
const ROLES = ['owner', 'admin', 'technician', 'attendant'];
const ALL_STAFF = ['admin', 'technician', 'attendant'];

const PERMISSIONS = {
  'orders.manage': { label: 'Abrir, atualizar e entregar OSs', group: 'Ordens de serviço', roles: ALL_STAFF },
  'orders.delete': { label: 'Remover OSs definitivamente', group: 'Ordens de serviço', roles: ['admin'] },
  'sales.create': { label: 'Registrar vendas e receber pagamentos', group: 'Vendas', roles: ALL_STAFF },
  'sales.refund': { label: 'Estornar vendas', group: 'Vendas', roles: ['admin'] },
  'cash.close': { label: 'Fechar o caixa do dia', group: 'Vendas', roles: ['admin'] },
  'catalog.edit': { label: 'Cadastrar e editar periféricos, peças, dispositivos e serviços', group: 'Gestão', roles: ['admin', 'attendant'] },
  'catalog.delete': { label: 'Desativar itens do estoque e serviços', group: 'Gestão', roles: ['admin'] },
  'suppliers.edit': { label: 'Cadastrar e editar fornecedores', group: 'Gestão', roles: ['admin', 'attendant'] },
  'costs.view': { label: 'Ver custos e lucros', group: 'Financeiro', roles: ['admin'] },
  'metrics.view': { label: 'Ver métricas de bancada, de balcão e da assistência', group: 'Financeiro', roles: ['admin'] },
  'goals.edit': { label: 'Definir metas', group: 'Financeiro', roles: ['admin'] },
  'users.manage': { label: 'Gerenciar usuários e permissões', group: 'Administração', roles: ['admin'] },
  'settings.manage': { label: 'Alterar configurações (feriados)', group: 'Administração', roles: ['admin'] },
};
const KEYS = Object.keys(PERMISSIONS);

// overrides: [{ key, allowed }] (como fica salvo no usuário) ou { chave: true | false }
const overridesToObject = (overrides) => {
  if (Array.isArray(overrides)) return Object.fromEntries(overrides.map((o) => [o.key, o.allowed]));
  return overrides || {};
};

function effectivePermissions(role, overrides) {
  if (role === 'owner') return [...KEYS];
  const map = overridesToObject(overrides);
  return KEYS.filter((k) => (map[k] === true || map[k] === false ? map[k] : PERMISSIONS[k].roles.includes(role)));
}

module.exports = { ROLES, PERMISSIONS, KEYS, effectivePermissions, overridesToObject };
