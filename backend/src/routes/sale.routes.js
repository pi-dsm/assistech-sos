const router = require('express').Router();
const c = require('../controllers/sale.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.post('/', can('sales.create'), c.create);
router.get('/', c.list);
router.get('/items', can('costs.view'), c.itemRows); // antes de '/:id'
router.get('/:id', c.get);
router.post('/:id/payments', can('sales.create'), c.addPayment);
router.patch('/:id/refund', can('sales.refund'), c.refund);

module.exports = router;
