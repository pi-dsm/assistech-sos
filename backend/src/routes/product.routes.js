const router = require('express').Router();
const c = require('../controllers/product.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list); // ?kind=peripheral|part|device
router.get('/barcode/:code', c.getByBarcode); // antes de '/:id'
router.get('/:id', c.get);
router.get('/:id/movements', c.movements);
router.post('/', can('catalog.edit'), c.create);
router.put('/:id', can('catalog.edit'), c.update);
router.patch('/:id/stock', can('catalog.edit'), c.adjustStock);
router.delete('/:id', can('catalog.delete'), c.remove);

module.exports = router;
