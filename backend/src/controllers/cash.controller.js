const CashClosing = require('../models/CashClosing');
const { receivedByMethod, isDay, dayStart, dayKey } = require('../services/payments.service');
const { asyncHandler, httpError, parseLimit } = require('../utils/helpers');
const { round2 } = require('../utils/money');

const POPULATE = [{ path: 'closed_by', select: 'name' }, { path: 'opened_by', select: 'name' }, { path: 'movements.by', select: 'name' }];
const today = () => dayKey(new Date());

// Esperado por forma de pagamento. No dinheiro: fundo de troco + suprimentos - sangrias.
async function expectedFor(day, float = 0, movements = []) {
  const from = dayStart(day);
  const received = await receivedByMethod(from, new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1));
  const cashAdjust = float + movements.reduce((s, m) => s + (m.kind === 'supply' ? m.amount : -m.amount), 0);
  return {
    ...received,
    methods: received.methods.map((m) => ({ ...m, expected: round2(m.total + (m.method === 'cash' ? cashAdjust : 0)) })),
  };
}

const openOf = async (day) => {
  const register = await CashClosing.findOne({ day });
  if (!register) throw httpError(409, 'O caixa deste dia ainda não foi aberto.');
  if (register.status === 'closed') throw httpError(409, 'O caixa deste dia já foi fechado.');
  return register;
};

// GET /cash-closings/status (alias /cash-register/status) -> caixa de hoje com o esperado
exports.status = asyncHandler(async (req, res) => {
  const day = isDay(req.query.day) ? req.query.day : today();
  const register = await CashClosing.findOne({ day }).populate(POPULATE);
  const expected = await expectedFor(day, register?.opening_float || 0, register?.movements || []);
  res.json({ day, register, ...expected });
});

// GET /cash-closings/preview?day=AAAA-MM-DD&opening_float=100 (fechamento de dia sem abertura registrada)
exports.preview = asyncHandler(async (req, res) => {
  const day = req.query.day;
  if (!isDay(day)) throw httpError(400, 'Informe o dia no formato AAAA-MM-DD');
  const closing = await CashClosing.findOne({ day }).populate(POPULATE);
  const float = closing ? closing.opening_float : Math.max(0, Number(req.query.opening_float) || 0);
  res.json({ day, opening_float: float, ...(await expectedFor(day, float, closing?.movements)), closing });
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await CashClosing.find().sort({ day: -1 }).limit(parseLimit(req.query.limit, 30, 365)).populate(POPULATE));
});

exports.get = asyncHandler(async (req, res) => {
  const closing = await CashClosing.findOne({ day: req.params.day }).populate(POPULATE);
  if (!closing) throw httpError(404, 'Nenhum caixa para este dia');
  res.json(closing);
});

// POST /cash-closings/open { opening_float }
exports.open = asyncHandler(async (req, res) => {
  const day = today();
  if (await CashClosing.findOne({ day })) throw httpError(409, 'O caixa de hoje já foi aberto.');
  const register = await CashClosing.create({ day, opening_float: Math.max(0, Number(req.body.opening_float) || 0), opened_by: req.user._id });
  res.status(201).json(await register.populate(POPULATE));
});

// POST /cash-closings/movements { kind: 'withdrawal' (sangria) | 'supply' (suprimento), amount, reason }
exports.movement = asyncHandler(async (req, res) => {
  const register = await openOf(today());
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw httpError(400, 'Informe um valor maior que zero');
  if (!String(req.body.reason || '').trim()) throw httpError(400, 'Informe o motivo');
  register.movements.push({ kind: req.body.kind, amount, reason: req.body.reason, by: req.user._id });
  await register.save();
  res.status(201).json(await register.populate(POPULATE));
});

// POST { day, opening_float, counted: { pix: 10, cash: 20, ... }, notes }
// O esperado é sempre recalculado no servidor; o cliente envia só o que foi contado.
exports.close = asyncHandler(async (req, res) => {
  const { day, counted = {}, notes } = req.body;
  if (!isDay(day)) throw httpError(400, 'Informe o dia no formato AAAA-MM-DD');
  const closing = (await CashClosing.findOne({ day })) || new CashClosing({ day, opening_float: Math.max(0, Number(req.body.opening_float) || 0) });
  const expected = await expectedFor(day, closing.opening_float, closing.movements);

  const rows = expected.methods.map((m) => {
    const value = counted[m.method];
    if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
      throw httpError(400, 'Informe o valor contado em todas as formas de pagamento');
    }
    return { method: m.method, expected: m.expected, counted: Number(value) };
  });

  closing.set({ rows, notes, status: 'closed', closed_by: req.user._id, closed_at: new Date() });
  await closing.save();
  res.status(201).json(await closing.populate(POPULATE));
});
