// Dados da própria assistência (Configurações do admin) e auditoria da loja
const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, pick, parseLimit } = require('../utils/helpers');

const FIELDS = ['name', 'document', 'phone', 'whatsapp', 'address', 'warranty_days', 'showcase'];

router.use(authenticate, authorize('admin'));
router.get('/', (req, res) => res.json(req.tenant));
router.put('/', asyncHandler(async (req, res) => {
  req.tenant.set(pick(req.body, FIELDS));
  await req.tenant.save();
  res.json(req.tenant);
}));
router.get('/audit', asyncHandler(async (req, res) => {
  const filter = { tenant: req.tenant._id, ...(req.query.user ? { user: req.query.user } : {}) };
  res.json(await AuditLog.find(filter).sort({ created_at: -1 }).limit(parseLimit(req.query.limit, 200, 1000)));
}));

module.exports = router;
