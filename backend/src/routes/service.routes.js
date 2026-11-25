const router = require('express').Router();
const c = require('../controllers/service.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.post('/', can('catalog.edit'), c.create);
router.put('/:id', can('catalog.edit'), c.update);
router.delete('/:id', can('catalog.delete'), c.remove);

module.exports = router;
