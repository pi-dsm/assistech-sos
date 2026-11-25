const Customer = require('../models/Customer');
const Device = require('../models/Device');
const ServiceOrder = require('../models/ServiceOrder');
const company = require('../config/company');
const { getCalendar } = require('./calendar.service');
const { CLOSED_STATUSES } = ServiceOrder;
const { pick, httpError } = require('../utils/helpers');
const { round2, formatBRL } = require('../utils/money');
const { netPaid, normalizePayments } = require('../utils/payments');
const Supplier = require('../models/Supplier');

const CUSTOMER_FIELDS = ['name', 'phone', 'alternative_phone'];
const DEVICE_FIELDS = ['device_type', 'brand', 'model', 'passcode'];
const PART_FIELDS = [
  'part_name', 'is_own_stock', 'supplier', 'purchase_reference',
  'cost_price', 'sale_price', 'quantity', 'warranty_days',
];
// Mudanças "rápidas" (sem dados obrigatórios). 'ready' e 'delivered' têm fluxo próprio.
const QUICK_STATUSES = ['received', 'in_diagnosis', 'in_repair', 'awaiting_part', 'cancelled'];

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const ensureOpen = (order) => {
  if (CLOSED_STATUSES.includes(order.status)) throw httpError(409, 'Esta OS já foi finalizada e não pode mais ser alterada.');
};

async function resolveDeadlines(body) {
  const rules = [
    ['budget_business_days', 'estimated_budget_at', 'orçamento'],
    ['delivery_business_days', 'estimated_delivery_at', 'entrega'],
  ];
  const out = {};
  let calendar;
  for (const [input, target, label] of rules) {
    if (body[input] === undefined) continue;
    const days = Number(body[input]);
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      throw httpError(400, `Prazo de ${label} inválido: informe de 0 a 90 dias úteis.`);
    }
    calendar = calendar || (await getCalendar());
    out[target] = calendar.addBusinessDays(new Date(), days);
  }
  return out;
}

async function attachSuppliers(parts) {
  const ids = [...new Set(parts.filter((p) => !p.is_own_stock && p.supplier).map((p) => String(p.supplier)))];
  const found = await Supplier.find({ _id: { $in: ids } }).select('name contact_name phone').lean();
  const byId = new Map(found.map((s) => [String(s._id), s]));
  return parts.map((p) => {
    if (p.is_own_stock || !p.supplier) return p;
    const s = byId.get(String(p.supplier));
    if (!s) throw httpError(400, 'Fornecedor da peça não encontrado. Selecione um fornecedor cadastrado.');
    return { ...p, supplier_name: s.name, supplier_contact: [s.contact_name, s.phone].filter(Boolean).join(' · ') };
  });
}

async function buildCustomer(body, userId) {
  if (body.customer_id) {
    const customer = await Customer.findById(body.customer_id);
    if (!customer) throw httpError(404, 'Cliente não encontrado');
    return customer;
  }
  if (!body.customer) throw httpError(400, 'Informe o cliente');
  return new Customer({ ...pick(body.customer, CUSTOMER_FIELDS), created_by: userId });
}

async function buildDevice(body, customer) {
  if (body.device_id) {
    const device = await Device.findOne({ _id: body.device_id, customer: customer._id });
    if (!device) throw httpError(404, 'Aparelho não encontrado para este cliente');
    if (body.device?.passcode) device.passcode = body.device.passcode; // a senha pode mudar entre atendimentos
    return device;
  }
  if (!body.device) throw httpError(400, 'Informe o aparelho');
  return new Device({ ...pick(body.device, DEVICE_FIELDS), customer: customer._id });
}

// 1) Abertura: valida tudo ANTES de gravar para não deixar cliente/aparelho órfãos.
exports.openOrder = async (body, user) => {
  const customer = await buildCustomer(body, user._id);
  const device = await buildDevice(body, customer);
  const order = new ServiceOrder({
    ...pick(body, ['reported_issue', 'estimated_budget_at', 'estimated_delivery_at', 'internal_notes']),
    ...(await resolveDeadlines(body)),
    customer: customer._id,
    device: device._id,
    status: 'received',
    status_history: [{ status: 'received', changed_by: user._id }],
    created_by: user._id,
    updated_by: user._id,
  });

  await Promise.all([customer.validate(), device.validate(), order.validate()]);
  if (customer.isNew) await customer.save();
  if (device.isNew || device.isModified()) await device.save();
  await order.save();
  return order;
};

// 2) Mudança rápida de status
exports.changeStatus = async (order, status, user) => {
  ensureOpen(order);
  if (status === 'ready') throw httpError(400, 'Para marcar como pronta, informe as peças utilizadas e a mão de obra.');
  if (status === 'delivered') throw httpError(400, 'Para entregar, registre o pagamento no fechamento da OS.');
  if (!QUICK_STATUSES.includes(status)) throw httpError(400, 'Status inválido');
  if (order.status === status) return order;

  if (order.status === 'ready') order.ready_at = undefined; // voltou para a bancada
  order.setStatus(status, user._id);
  await order.save();
  return order;
};

// 3) Registro da manutenção: relatório, peças (opcionais) e mão de obra.
//    conclude: false só salva (orçamento ou reparo em andamento); conclude: true (padrão) também marca como pronta.
exports.markReady = async (order, body, user) => {
  const conclude = body.conclude !== false;
  const allowed = conclude ? ['in_repair', 'awaiting_part', 'ready'] : ['in_diagnosis', 'in_repair', 'awaiting_part', 'ready'];
  if (!allowed.includes(order.status)) {
    throw httpError(409, conclude ? 'Só é possível concluir uma OS que está em reparo.' : 'Inicie a análise ou o reparo para registrar a manutenção.');
  }
  let parts = body.no_parts_used ? [] : Array.isArray(body.parts_used) ? body.parts_used.map((p) => pick(p, PART_FIELDS)) : [];
  if (parts.length) parts = await attachSuppliers(parts);

  if (body.maintenance_report !== undefined) order.maintenance_report = body.maintenance_report;
  order.parts_used = parts;
  order.no_parts_used = conclude && parts.length === 0;
  order.labor_amount = round2(body.labor_amount || 0);
  if (!conclude) {
    order.updated_by = user._id;
  } else if (order.status !== 'ready') {
    order.ready_at = new Date();
    order.setStatus('ready', user._id);
  } else {
    order.updated_by = user._id; // correção de dados com a OS já pronta
  }
  await order.save();
  return order;
};

// 4) ready -> delivered: pagamento, desconto e saldo pendente explícito
exports.deliver = async (order, body, user) => {
  if (order.status !== 'ready') throw httpError(409, 'Só é possível entregar uma OS que está pronta.');

  const gross = round2(order.parts_total_amount + order.labor_amount);
  const discount = round2(body.discount_amount || 0);
  if (discount < 0 || discount > gross) throw httpError(400, 'Desconto inválido: não pode ser maior que o valor da OS.');
  order.discount_amount = discount;
  order.recalculate();

  normalizePayments(body.payments).forEach((p) => order.payments.push(p));

  const balance = round2(Math.max(0, order.grand_total_amount - netPaid(order.payments)));
  if (balance > 0 && !body.allow_partial) {
    throw httpError(400, `Falta receber ${formatBRL(balance)}. Registre o pagamento ou confirme a entrega com saldo pendente.`);
  }

  const now = new Date();
  const days = Number.isFinite(Number(body.warranty_days)) && body.warranty_days !== '' && body.warranty_days !== null
    ? Math.max(0, Math.floor(Number(body.warranty_days)))
    : company.defaultWarrantyDays;
  order.delivered_at = now;
  order.warranty_days = days;
  order.warranty_until = days > 0 ? addDays(now, days) : undefined;
  order.setStatus('delivered', user._id);
  await order.save();
  return order;
};

// 5) Pagamento posterior (ex.: quitar saldo pendente depois da entrega)
exports.addPayment = async (order, body, user) => {
  if (!['ready', 'delivered'].includes(order.status)) {
    throw httpError(409, 'Pagamentos só podem ser registrados em OS prontas ou entregues.');
  }
  const [payment] = normalizePayments([body]);
  if (!payment) throw httpError(400, 'Informe o pagamento');
  if (payment.amount > order.balance_due + 0.001) {
    throw httpError(400, `Valor excede o saldo restante (${formatBRL(order.balance_due)}).`);
  }
  order.payments.push(payment);
  order.updated_by = user._id;
  await order.save();
  return order;
};

// 6) Retorno: nova OS vinculada à original.
//    Na garantia: original -> returned (dados travados) e a nova OS é de garantia (sem cobrança).
//    Fora da garantia: só com charged=true; a nova OS é cobrada normalmente e a original continua entregue.
//    Perda (loss_amount/loss_reason) e anotação ficam registradas na nova OS.
exports.registerReturn = async (original, body, user) => {
  if (original.status !== 'delivered') throw httpError(409, 'Apenas OS entregues podem ser reabertas como retorno.');
  const underWarranty = original.is_under_warranty;
  if (!underWarranty && !body.charged) {
    throw httpError(409, 'A garantia desta OS já expirou. Confirme a reabertura como retorno cobrado.');
  }
  const loss = round2(Number(body.loss_amount) || 0);
  if (loss < 0) throw httpError(400, 'Valor de perda inválido');

  const label = underWarranty ? 'Retorno em garantia' : 'Retorno cobrado (garantia vencida)';
  const note = String(body.notes || body.internal_notes || '').trim();
  const returnOrder = new ServiceOrder({
    ...pick(body, ['reported_issue', 'estimated_budget_at', 'estimated_delivery_at']),
    ...(await resolveDeadlines(body)),
    customer: original.customer,
    device: original.device,
    origin_order: original._id,
    is_warranty: underWarranty,
    return_kind: underWarranty ? 'warranty' : 'paid',
    return_loss_amount: loss,
    return_loss_reason: loss > 0 ? String(body.loss_reason || 'Não informado').trim() : undefined,
    internal_notes: `${label} da OS #${original.service_order_number}.${note ? ` ${note}` : ''}`,
    status: 'received',
    status_history: [{ status: 'received', changed_by: user._id }],
    created_by: user._id,
    updated_by: user._id,
  });
  await returnOrder.save(); // valida antes de alterar a original

  if (underWarranty) {
    original.setStatus('returned', user._id);
    await original.save();
  }
  return returnOrder;
};

// 7) Cancelamento
exports.cancel = async (order, user) => {
  ensureOpen(order);
  order.setStatus('cancelled', user._id);
  await order.save();
  return order;
};