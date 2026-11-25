const argon2 = require('argon2');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const ServiceOrder = require('../models/ServiceOrder');
const Sale = require('../models/Sale');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, pick, httpError, parseLimit } = require('../utils/helpers');
const { round2 } = require('../utils/money');

const { PLANS } = Tenant;
const countBy = async (Model) => new Map((await Model.aggregate([{ $group: { _id: '$tenant', n: { $sum: 1 } } }])).map((r) => [String(r._id), r.n]));

// GET /super/tenants -> assinantes com uso (usuários, OSs e vendas)
exports.list = asyncHandler(async (req, res) => {
  const [tenants, users, orders, sales] = await Promise.all([Tenant.find().sort({ name: 1 }), countBy(User), countBy(ServiceOrder), countBy(Sale)]);
  res.json(tenants.map((t) => ({ ...t.toJSON(), usage: { users: users.get(String(t._id)) || 0, orders: orders.get(String(t._id)) || 0, sales: sales.get(String(t._id)) || 0 } })));
});

// POST /super/tenants { name, slug, plan, phone, admin: { name, email, password } }
exports.create = asyncHandler(async (req, res) => {
  const admin = req.body.admin || {};
  if (!admin.name || !admin.email || !admin.password || admin.password.length < 6) {
    throw httpError(400, 'Informe nome, e-mail e senha (mín. 6 caracteres) do admin da assistência');
  }
  if (await User.exists({ email: String(admin.email).toLowerCase().trim() })) throw httpError(409, 'Já existe um usuário com este e-mail');
  const tenant = await Tenant.create(pick(req.body, ['name', 'slug', 'plan', 'phone', 'whatsapp', 'address', 'document']));
  await User.create({ name: admin.name, email: admin.email, role: 'admin', tenant: tenant._id, password: await argon2.hash(admin.password) });
  res.status(201).json(tenant);
});

// PUT /super/tenants/:id { name, plan, is_active }
exports.update = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw httpError(404, 'Assinante não encontrado');
  if (req.body.is_active === false && tenant.is_active) tenant.deactivated_at = new Date();
  if (req.body.is_active === true) tenant.deactivated_at = undefined;
  tenant.set(pick(req.body, ['name', 'plan', 'is_active', 'phone', 'whatsapp', 'address', 'document']));
  await tenant.save();
  res.json(tenant);
});

// GET /super/metrics -> MRR, ARR, churn (30 dias), ticket médio por assinante e LTV
exports.metrics = asyncHandler(async (req, res) => {
  const tenants = await Tenant.find().lean();
  const active = tenants.filter((t) => t.is_active);
  const since = new Date(Date.now() - 30 * 86400000);
  const churned = tenants.filter((t) => !t.is_active && t.deactivated_at >= since).length;
  const mrr = round2(active.reduce((s, t) => s + PLANS[t.plan].price, 0));
  const arpu = active.length ? round2(mrr / active.length) : 0;
  const churnRate = active.length + churned ? churned / (active.length + churned) : 0;
  res.json({
    tenants: tenants.length,
    active: active.length,
    mrr,
    arr: round2(mrr * 12),
    churn_rate: round2(churnRate * 100),
    arpu,
    ltv: churnRate ? round2(arpu / churnRate) : null, // sem cancelamentos no período, o LTV fica indefinido
    by_plan: Object.entries(PLANS).map(([key, p]) => ({ key, ...p, count: active.filter((t) => t.plan === key).length })),
    users: await User.countDocuments({ role: { $ne: 'superadmin' }, is_active: true }),
  });
});

// GET /super/audit?tenant=ID -> auditoria de toda a plataforma
exports.audit = asyncHandler(async (req, res) => {
  const filter = req.query.tenant ? { tenant: req.query.tenant } : {};
  res.json(await AuditLog.find(filter).sort({ created_at: -1 }).limit(parseLimit(req.query.limit, 200, 1000)).populate('tenant', 'name'));
});

exports.plans = (req, res) => res.json(PLANS);
