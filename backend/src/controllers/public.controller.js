const Tenant = require('../models/Tenant');
const ServiceOrder = require('../models/ServiceOrder');
const Product = require('../models/Product');
const Service = require('../models/Service');
const { runAs } = require('../config/tenant');
const { asyncHandler, httpError } = require('../utils/helpers');

// router.param('slug'): carrega a assistência da vitrine e filtra as consultas por ela
exports.loadStore = async (req, res, next, slug) => {
  try {
    const tenant = await Tenant.findOne({ slug: String(slug).toLowerCase(), is_active: true });
    if (!tenant) return res.status(404).json({ message: 'Assistência não encontrada' });
    req.tenant = tenant;
    runAs(tenant, next);
  } catch (err) {
    next(err);
  }
};

const store = (t) => ({ name: t.name, slug: t.slug, phone: t.phone, whatsapp: t.whatsapp, address: t.address, ...t.showcase?.toObject?.() });

// GET /public/stores/:slug -> vitrine: dados da loja, produtos marcados, aparelhos à venda e serviços
exports.showcase = asyncHandler(async (req, res) => {
  if (req.tenant.showcase?.enabled === false) throw httpError(404, 'Vitrine desativada');
  const [products, services] = await Promise.all([
    Product.find({ is_active: true, show_in_showcase: true, stock_quantity: { $gt: 0 } }).select('name kind category description sale_price').sort({ name: 1 }).lean(),
    Service.find({ is_active: true }).select('name description price').sort({ name: 1 }).lean(),
  ]);
  res.json({ store: store(req.tenant), products, services });
});

const findOrder = async (number) => {
  const n = Number(number);
  if (!Number.isInteger(n)) throw httpError(400, 'Número de OS inválido');
  const os = await ServiceOrder.findOne({ service_order_number: n }).populate('device', 'brand model');
  if (!os) throw httpError(404, 'Ordem de serviço não encontrada');
  return os;
};

// Só dados não sensíveis (sem senha do aparelho e sem dados do cliente)
const publicView = (os, tenant) => ({
  store: store(tenant),
  service_order_number: os.service_order_number,
  status: os.status,
  device: os.device ? `${os.device.brand} ${os.device.model}` : '—',
  reported_issue: os.reported_issue,
  received_at: os.created_at,
  estimated_delivery_at: os.estimated_delivery_at || null,
  budget: { parts: os.parts_used.map((p) => ({ name: p.part_name, quantity: p.quantity, price: p.sale_price })), labor: os.labor_amount, total: os.grand_total_amount },
  can_approve: os.status === 'in_diagnosis' && !os.budget_approved_at,
  budget_approved_at: os.budget_approved_at || null,
  finished_at: os.ready_at || null,
  delivered_at: os.delivered_at || null,
  warranty_until: os.warranty_until || null,
});

// GET /public/stores/:slug/service-orders/:number
exports.track = asyncHandler(async (req, res) => res.json(publicView(await findOrder(req.params.number), req.tenant)));

// POST /public/stores/:slug/service-orders/:number/approve -> cliente aprova o orçamento; a OS vai para "Em reparo"
exports.approve = asyncHandler(async (req, res) => {
  const os = await findOrder(req.params.number);
  if (os.status !== 'in_diagnosis' || os.budget_approved_at) throw httpError(409, 'Não há orçamento aguardando aprovação nesta OS.');
  os.budget_approved_at = new Date();
  os.setStatus('in_repair', undefined);
  await os.save();
  req.user = { name: 'Cliente (link público)', tenant: req.tenant._id }; // para a auditoria
  res.json(publicView(os, req.tenant));
});
