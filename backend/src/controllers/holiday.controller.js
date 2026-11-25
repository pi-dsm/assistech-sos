const Holiday = require('../models/Holiday');
const { nationalHolidays } = require('../utils/businessDays');
const { asyncHandler, pick, httpError } = require('../utils/helpers');

// GET /holidays?year=2026 -> feriados nacionais do ano + os locais da assistência
exports.list = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  res.json({ year, national: nationalHolidays(year), custom: await Holiday.find().sort({ date: 1 }) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Holiday.create(pick(req.body, ['date', 'name', 'scope'])));
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await Holiday.findByIdAndDelete(req.params.id))) throw httpError(404, 'Feriado não encontrado');
  res.json({ message: 'Feriado removido' });
});
