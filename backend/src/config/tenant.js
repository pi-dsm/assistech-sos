// Multi-tenant: cada assistência (assinante) só enxerga os próprios dados.
// O middleware de autenticação guarda o assinante da requisição aqui (AsyncLocalStorage)
// e o plugin abaixo aplica o filtro { tenant } em todas as consultas dos models que o usam.
const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');

const als = new AsyncLocalStorage();
const currentTenantDoc = () => als.getStore()?.tenant || null;
const currentTenant = () => currentTenantDoc()?._id || null;
const runAs = (tenantDoc, fn) => als.run({ tenant: tenantDoc || null }, fn); // sem assinante = superadmin (vê tudo)

const QUERIES = ['find', 'findOne', 'countDocuments', 'distinct', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'];

function tenantPlugin(schema) {
  schema.add({ tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true } });
  schema.pre(QUERIES, function () {
    if (currentTenant()) this.where({ tenant: currentTenant() });
  });
  schema.pre('aggregate', function () {
    if (currentTenant()) this.pipeline().unshift({ $match: { tenant: currentTenant() } });
  });
  schema.pre('validate', function () {
    if (!this.tenant) this.tenant = currentTenant();
  });
  schema.pre('insertMany', function (next, docs) {
    docs.forEach((d) => { if (!d.tenant) d.tenant = currentTenant(); });
    next();
  });
}

module.exports = { tenantPlugin, runAs, currentTenant, currentTenantDoc };
