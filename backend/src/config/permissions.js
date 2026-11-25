// Perfis: superadmin (gestor da plataforma), admin (dono da assistência) e user.
// O admin tem tudo; o user tem só as permissões que o admin marcar para ele.
const ROLES = ['superadmin', 'admin', 'user'];

const PERMISSIONS = {
  'orders.manage': { label: 'Abrir, atualizar e entregar OSs', group: 'Ordens de serviço', default: true },
  'orders.delete': { label: 'Remover OSs definitivamente', group: 'Ordens de serviço' },
  'sales.create': { label: 'Registrar vendas e receber pagamentos', group: 'Vendas', default: true },
  'sales.refund': { label: 'Estornar vendas', group: 'Vendas' },
  'cash.close': { label: 'Abrir, movimentar e fechar o caixa', group: 'Vendas', default: true },
  'catalog.edit': { label: 'Cadastrar e editar estoque, serviços e compras', group: 'Gestão', default: true },
  'catalog.delete': { label: 'Desativar itens do estoque e serviços', group: 'Gestão' },
  'suppliers.edit': { label: 'Cadastrar e editar fornecedores', group: 'Gestão', default: true },
  'costs.view': { label: 'Ver custos e lucros', group: 'Financeiro' },
  'metrics.view': { label: 'Ver métricas de bancada e de balcão', group: 'Financeiro' },
  'goals.edit': { label: 'Definir metas', group: 'Financeiro' },
};
const KEYS = Object.keys(PERMISSIONS);
const DEFAULT_PERMISSIONS = KEYS.filter((k) => PERMISSIONS[k].default);

module.exports = { ROLES, PERMISSIONS, KEYS, DEFAULT_PERMISSIONS };
