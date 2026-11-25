const router = require('express').Router();
const c = require('../controllers/serviceOrder.controller');
const { authenticate, can } = require('../middleware/auth');

const manage = can('orders.manage');

router.use(authenticate);
router.post('/', manage, c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', manage, c.update);
router.patch('/:id/status', manage, c.updateStatus);
router.patch('/:id/ready', manage, c.markReady);
router.patch('/:id/deliver', manage, c.deliver);
router.post('/:id/payments', manage, c.addPayment);
router.post('/:id/return', manage, c.registerReturn);
router.post('/:id/notify-whatsapp', c.notifyWhatsapp);
router.get('/:id/receipt.pdf', c.receiptPdf);
router.get('/:id/warranty.pdf', c.warrantyPdf);
router.delete('/:id', manage, c.remove); // ?hard=true exige também orders.delete

module.exports = router;
