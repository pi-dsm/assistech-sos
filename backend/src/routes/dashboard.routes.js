const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', c.summary);
router.get('/overview', c.overview);
router.get('/sales', can('metrics.view'), c.salesAnalytics);
router.get('/payments', can('metrics.view'), c.payments); // recebimentos por forma de pagamento num intervalo
router.get('/goals', c.getGoals);
router.put('/goals', can('goals.edit'), c.updateGoals);

module.exports = router;
