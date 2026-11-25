const router = require('express').Router();
const c = require('../controllers/public.controller');

router.param('slug', c.loadStore);
router.get('/stores/:slug', c.showcase);
router.get('/stores/:slug/service-orders/:number', c.track);
router.post('/stores/:slug/service-orders/:number/approve', c.approve);

module.exports = router;
