const router = require('express').Router();
const c = require('../controllers/super.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('superadmin'));
router.get('/plans', c.plans);
router.get('/metrics', c.metrics);
router.get('/audit', c.audit);
router.get('/tenants', c.list);
router.post('/tenants', c.create);
router.put('/tenants/:id', c.update);

module.exports = router;
