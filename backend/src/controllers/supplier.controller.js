const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { round2 } = require('../utils/money');
const { asyncHandler, pick, clean, escapeRegex, onlyDigits, parseLimit, httpError } = require('../utils/helpers');

const FIELDS = ['name', 'document', 'contact_name', 'phone', 'email', 'address', 'city', 'state', 'notes'];

// Aplica os campos; string vazia limpa o campo (permite apagar telefone, e-mail etc.)
const applyFields = (supplier, body) => {
  FIELDS.forEach((f) => {
    if (body[f] === undefined) return;
    supplier[f] = body[f] === '' || body[f] === null ? undefined : body[f];
  });
};

const load = async (id) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw httpError(404, 'Fornecedor não encontrado');
  return supplier;
};

// GET /suppliers?q=&status=active|inactive|all (padrão: active)
exports.list = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};
  if (status === 'inactive') filter.is_active = false;
  else if (status !== 'all') filter.is_active = true;

  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    const digits = onlyDigits(term);
    filter.$or = [{ name: rx }, { contact_name: rx }, { city: rx }, { phone: rx }, { email: rx }];
    if (digits.length >= 3) filter.$or.push({ document_digits: new RegExp(escapeRegex(digits)) });
  }
  res.json(await Supplier.find(filter).sort({ name: 1 }).limit(parseLimit(req.query.limit, 100, 500)));
});

exports.get = asyncHandler(async (req, res) => res.json(await load(req.params.id)));

exports.create = asyncHandler(async (req, res) => {
  const supplier = new Supplier({ ...pick(clean(req.body), FIELDS), created_by: req.user._id });
  await supplier.save();
  res.status(201).json(supplier);
});

exports.update = asyncHandler(async (req, res) => {
  const supplier = await load(req.params.id);
  applyFields(supplier, req.body);
  await supplier.save();
  res.json(supplier);
});

// PATCH /suppliers/:id/status { is_active: false }  -> inativar / reativar
exports.setStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.is_active !== 'boolean') throw httpError(400, 'Informe is_active (true ou false)');
  const supplier = await load(req.params.id);
  supplier.is_active = req.body.is_active;
  await supplier.save();
  res.json(supplier);
});
// POST /suppliers/purchase-order { supplier, reference, items: [{ product, quantity, unit_cost }] }
// Dá entrada no estoque e recalcula o custo pelo custo médio ponderado:
// novo custo = (estoque atual x custo atual + quantidade comprada x custo da compra) / estoque final
exports.purchaseOrder = asyncHandler(async (req, res) => {
  const { reference, items } = req.body;
  const supplier = await load(req.body.supplier);
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Informe ao menos um item da compra');
  const updated = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);
    if (!Number.isInteger(quantity) || quantity < 1 || !(unitCost >= 0)) throw httpError(400, 'Quantidade ou custo inválido');
    const product = await Product.findById(item.product);
    if (!product) throw httpError(404, 'Produto da compra não encontrado');
    const total = product.stock_quantity + quantity;
    product.cost_price = round2((product.stock_quantity * product.cost_price + quantity * unitCost) / total);
    product.stock_quantity = total;
    product.supplier = supplier._id;
    await product.save();
    await StockMovement.create({
      product: product._id, kind: 'purchase', quantity, balance_after: total, unit_cost: unitCost,
      supplier: supplier._id, reason: `Compra ${reference || ''} - ${supplier.name}`.trim(), created_by: req.user._id,
    });
    updated.push(product);
  }
  res.status(201).json({ supplier, reference, products: updated });
});
