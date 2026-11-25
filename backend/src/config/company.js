// Dados da empresa nos comprovantes: vêm do assinante da requisição atual.
const { currentTenantDoc } = require('./tenant');

const t = () => currentTenantDoc() || {};
module.exports = {
  get name() { return t().name || 'AssisTech SOS'; },
  get document() { return t().document || ''; },
  get phone() { return t().phone || ''; },
  get address() { return t().address || ''; },
  get defaultWarrantyDays() { return t().warranty_days ?? 90; },
  abandonmentDays: 30,
};
