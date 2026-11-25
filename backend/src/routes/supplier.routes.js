const router = require('express').Router();
const c = require('../controllers/supplier.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', can('suppliers.edit'), c.create);
router.put('/:id', can('suppliers.edit'), c.update);
router.patch('/:id/status', can('suppliers.edit'), c.setStatus);

module.exports = router;
