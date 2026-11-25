const CashClosing = require('../models/CashClosing');
const { receivedByMethod, isDay, dayStart } = require('../services/payments.service');
const { asyncHandler, httpError, parseLimit } = require('../utils/helpers');
const { round2 } = require('../utils/money');

async function expectedFor(day, openingFloat = 0) {
  const from = dayStart(day);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  const received = await receivedByMethod(from, to);
  return {
    ...received,
    methods: received.methods.map((m) => ({ ...m, expected: round2(m.total + (m.method === 'cash' ? openingFloat : 0)) })),
  };
}

// GET /cash-closings/preview?day=AAAA-MM-DD&opening_float=100
exports.preview = asyncHandler(async (req, res) => {
  const day = req.query.day;
  if (!isDay(day)) throw httpError(400, 'Informe o dia no formato AAAA-MM-DD');
  const float = Math.max(0, Number(req.query.opening_float) || 0);
  const [expected, closing] = await Promise.all([expectedFor(day, float), CashClosing.findOne({ day }).populate('closed_by', 'name')]);
  res.json({ day, opening_float: float, ...expected, closing });
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await CashClosing.find().sort({ day: -1 }).limit(parseLimit(req.query.limit, 30, 365)).populate('closed_by', 'name'));
});

exports.get = asyncHandler(async (req, res) => {
  const closing = await CashClosing.findOne({ day: req.params.day }).populate('closed_by', 'name');
  if (!closing) throw httpError(404, 'Nenhum fechamento para este dia');
  res.json(closing);
});

// POST { day, opening_float, counted: { pix: 10, cash: 20, ... }, notes }
// O esperado é sempre recalculado no servidor; o cliente envia só o que foi contado.
exports.close = asyncHandler(async (req, res) => {
  const { day, counted = {}, notes } = req.body;
  if (!isDay(day)) throw httpError(400, 'Informe o dia no formato AAAA-MM-DD');
  const float = Math.max(0, Number(req.body.opening_float) || 0);
  const expected = await expectedFor(day, float);

  const rows = expected.methods.map((m) => {
    const value = counted[m.method];
    if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
      throw httpError(400, 'Informe o valor contado em todas as formas de pagamento');
    }
    return { method: m.method, expected: m.expected, counted: Number(value) };
  });

  const closing = (await CashClosing.findOne({ day })) || new CashClosing({ day });
  closing.set({ opening_float: float, rows, notes, closed_by: req.user._id });
  await closing.save();
  res.status(201).json(await closing.populate('closed_by', 'name'));
});
