const router = require('express').Router();
const c = require('../controllers/cash.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate, can('cash.close'));
router.get('/', c.list);
router.get('/preview', c.preview); // ?day=AAAA-MM-DD -> esperado por forma de pagamento
router.get('/:day', c.get);
router.post('/', c.close); // cria ou refaz o fechamento do dia

module.exports = router;
