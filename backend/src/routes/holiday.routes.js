const router = require('express').Router();
const c = require('../controllers/holiday.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/preview', c.preview);
router.post('/', can('settings.manage'), c.create);
router.delete('/:id', can('settings.manage'), c.remove);

module.exports = router;
