// Documentação OpenAPI (Swagger UI em /api-docs). Cada linha: [método, rota, resumo, tag, acesso].
// Acesso: 'público', 'login', 'admin', 'superadmin' ou a permissão exigida (ex.: 'sales.refund').
const ROUTES = [
  ['post', '/auth/login', 'Login (e-mail e senha) -> token JWT', 'Autenticação', 'público'],
  ['post', '/auth/refresh-token', 'Renova o token da sessão', 'Autenticação', 'login'],
  ['get', '/auth/me', 'Usuário logado, assinante e permissões', 'Autenticação', 'login'],
  ['patch', '/auth/me/preferences', 'Tema e visualização preferida das OSs', 'Autenticação', 'login'],

  ['get', '/super/metrics', 'Métricas SaaS: MRR, ARR, churn, ARPU e LTV', 'SuperAdmin', 'superadmin'],
  ['get', '/super/plans', 'Planos da assinatura', 'SuperAdmin', 'superadmin'],
  ['get', '/super/tenants', 'Assinantes com uso (usuários, OSs, vendas)', 'SuperAdmin', 'superadmin'],
  ['post', '/super/tenants', 'Cria assinante e o admin da assistência', 'SuperAdmin', 'superadmin'],
  ['put', '/super/tenants/{id}', 'Altera plano, dados ou ativa/desativa o assinante', 'SuperAdmin', 'superadmin'],
  ['get', '/super/audit', 'Auditoria de toda a plataforma (?tenant=)', 'SuperAdmin', 'superadmin'],

  ['get', '/tenant', 'Dados da própria assistência', 'Assistência', 'admin'],
  ['put', '/tenant', 'Altera dados da loja, garantia e vitrine', 'Assistência', 'admin'],
  ['get', '/tenant/audit', 'Auditoria da assistência (quem fez o quê e quando)', 'Assistência', 'admin'],

  ['get', '/users/permissions', 'Permissões que o admin pode marcar para cada user', 'Usuários', 'admin'],
  ['get', '/users', 'Lista usuários', 'Usuários', 'admin'],
  ['post', '/users', 'Cria usuário (respeita o limite do plano)', 'Usuários', 'admin'],
  ['get', '/users/{id}', 'Detalhe do usuário', 'Usuários', 'admin'],
  ['put', '/users/{id}', 'Edita dados, perfil e permissões', 'Usuários', 'admin'],
  ['patch', '/users/{id}/toggle-status', 'Ativa ou desativa', 'Usuários', 'admin'],

  ['get', '/service-orders', 'Lista OSs (?scope=open|closed&status=&q=) — alias /os', 'Ordens de serviço', 'login'],
  ['post', '/service-orders', 'Abre OS com cliente, aparelho e senha', 'Ordens de serviço', 'orders.manage'],
  ['get', '/service-orders/{id}', 'Detalhe da OS', 'Ordens de serviço', 'login'],
  ['put', '/service-orders/{id}', 'Edita a OS', 'Ordens de serviço', 'orders.manage'],
  ['patch', '/service-orders/{id}/status', 'Muda status (Kanban)', 'Ordens de serviço', 'orders.manage'],
  ['patch', '/service-orders/{id}/ready', 'Conclui com peças e mão de obra', 'Ordens de serviço', 'orders.manage'],
  ['patch', '/service-orders/{id}/deliver', 'Entrega com pagamento e garantia', 'Ordens de serviço', 'orders.manage'],
  ['post', '/service-orders/{id}/payments', 'Lança pagamento', 'Ordens de serviço', 'orders.manage'],
  ['post', '/service-orders/{id}/return', 'Reabre como retorno (garantia ou cobrado)', 'Ordens de serviço', 'orders.manage'],
  ['post', '/service-orders/{id}/notify-whatsapp', 'Mensagem do status e link wa.me (envio opcional)', 'Ordens de serviço', 'login'],
  ['get', '/service-orders/{id}/receipt.pdf', 'Impressão da ordem de serviço (PDF)', 'Ordens de serviço', 'login'],
  ['get', '/service-orders/{id}/warranty.pdf', 'Termo de garantia (PDF)', 'Ordens de serviço', 'login'],
  ['delete', '/service-orders/{id}', 'Cancela (?hard=true remove; exige orders.delete)', 'Ordens de serviço', 'orders.manage'],

  ['get', '/sales', 'Lista vendas', 'Vendas e caixa', 'login'],
  ['post', '/sales', 'Registra venda com baixa de estoque — alias /pdv/checkout', 'Vendas e caixa', 'sales.create'],
  ['get', '/sales/items', 'Itens vendidos com custo e lucro', 'Vendas e caixa', 'costs.view'],
  ['get', '/sales/{id}', 'Detalhe da venda', 'Vendas e caixa', 'login'],
  ['post', '/sales/{id}/payments', 'Quita saldo pendente', 'Vendas e caixa', 'sales.create'],
  ['patch', '/sales/{id}/refund', 'Estorna a venda', 'Vendas e caixa', 'sales.refund'],
  ['get', '/cash-closings/status', 'Caixa de hoje e valores esperados — alias /cash-register/status', 'Vendas e caixa', 'cash.close'],
  ['post', '/cash-closings/open', 'Abre o caixa com fundo de troco', 'Vendas e caixa', 'cash.close'],
  ['post', '/cash-closings/movements', 'Sangria ou suprimento', 'Vendas e caixa', 'cash.close'],
  ['get', '/cash-closings/preview', 'Esperado por forma de pagamento num dia', 'Vendas e caixa', 'cash.close'],
  ['post', '/cash-closings', 'Fecha o caixa com os valores contados', 'Vendas e caixa', 'cash.close'],
  ['get', '/cash-closings', 'Histórico de caixas', 'Vendas e caixa', 'cash.close'],

  ['get', '/products', 'Estoque (?kind=peripheral|part|device) — alias /inventory', 'Estoque e compras', 'login'],
  ['post', '/products', 'Cadastra item', 'Estoque e compras', 'catalog.edit'],
  ['get', '/products/barcode/{code}', 'Busca por código de barras', 'Estoque e compras', 'login'],
  ['put', '/products/{id}', 'Edita item', 'Estoque e compras', 'catalog.edit'],
  ['patch', '/products/{id}/stock', 'Ajuste de estoque', 'Estoque e compras', 'catalog.edit'],
  ['get', '/products/{id}/movements', 'Movimentações do item', 'Estoque e compras', 'login'],
  ['delete', '/products/{id}', 'Desativa item', 'Estoque e compras', 'catalog.delete'],
  ['get', '/suppliers', 'Lista fornecedores', 'Estoque e compras', 'login'],
  ['post', '/suppliers', 'Cadastra fornecedor', 'Estoque e compras', 'suppliers.edit'],
  ['put', '/suppliers/{id}', 'Edita fornecedor', 'Estoque e compras', 'suppliers.edit'],
  ['patch', '/suppliers/{id}/status', 'Ativa ou inativa fornecedor', 'Estoque e compras', 'suppliers.edit'],
  ['post', '/suppliers/purchase-order', 'Compra: entrada no estoque com custo médio ponderado', 'Estoque e compras', 'catalog.edit'],
  ['get', '/services', 'Lista serviços', 'Estoque e compras', 'login'],
  ['post', '/services', 'Cadastra serviço', 'Estoque e compras', 'catalog.edit'],
  ['put', '/services/{id}', 'Edita serviço', 'Estoque e compras', 'catalog.edit'],
  ['delete', '/services/{id}', 'Desativa serviço', 'Estoque e compras', 'catalog.delete'],

  ['get', '/customers', 'Lista e busca clientes', 'Clientes', 'login'],
  ['post', '/customers', 'Cadastra cliente', 'Clientes', 'login'],
  ['put', '/customers/{id}', 'Edita cliente', 'Clientes', 'login'],
  ['get', '/customers/{id}/devices', 'Aparelhos do cliente', 'Clientes', 'login'],
  ['post', '/devices', 'Cadastra aparelho', 'Clientes', 'login'],
  ['put', '/devices/{id}', 'Edita aparelho', 'Clientes', 'login'],

  ['get', '/dashboard/summary', 'Faturamento, lucro e perdas por período', 'Métricas', 'login'],
  ['get', '/dashboard/overview', 'Resumo da tela inicial', 'Métricas', 'login'],
  ['get', '/dashboard/sales', 'Analítico de vendas (ABC, giro, ticket)', 'Métricas', 'metrics.view'],
  ['get', '/dashboard/payments', 'Recebimentos por forma de pagamento', 'Métricas', 'metrics.view'],
  ['get', '/dashboard/predictive-revenue', 'Previsão de receita (regressão linear) — alias /analytics/predictive-revenue', 'Métricas', 'metrics.view'],
  ['get', '/dashboard/goals', 'Metas', 'Métricas', 'login'],
  ['put', '/dashboard/goals', 'Define metas', 'Métricas', 'goals.edit'],

  ['get', '/holidays', 'Feriados nacionais e locais (?year=)', 'Feriados', 'login'],
  ['post', '/holidays', 'Cadastra feriado local', 'Feriados', 'admin'],
  ['delete', '/holidays/{id}', 'Remove feriado local', 'Feriados', 'admin'],

  ['get', '/public/stores/{slug}', 'Vitrine pública da assistência', 'Público', 'público'],
  ['get', '/public/stores/{slug}/service-orders/{number}', 'Consulta pública da OS', 'Público', 'público'],
  ['post', '/public/stores/{slug}/service-orders/{number}/approve', 'Cliente aprova o orçamento', 'Público', 'público'],
];

const paths = {};
for (const [method, path, summary, tag, access] of ROUTES) {
  const parameters = [...path.matchAll(/{(\w+)}/g)].map(([, name]) => ({ name, in: 'path', required: true, schema: { type: 'string' } }));
  paths[path] = paths[path] || {};
  paths[path][method] = {
    tags: [tag],
    summary,
    description: `Acesso: ${access}`,
    parameters,
    ...(access === 'público' ? { security: [] } : {}),
    ...(['post', 'put', 'patch'].includes(method) ? { requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } } : {}),
    responses: { 200: { description: 'OK' }, 400: { description: 'Dados inválidos' }, 401: { description: 'Sem login' }, 403: { description: 'Sem permissão' } },
  };
}

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'API AssisTech SOS',
    version: '3.0.0',
    description: 'SaaS multi-assistência: ordens de serviço, PDV, caixa, estoque, vitrine pública e portal do SuperAdmin. Cada assistência só acessa os próprios dados.',
  },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  security: [{ bearerAuth: [] }],
  paths,
};
