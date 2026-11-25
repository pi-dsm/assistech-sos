const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authenticate, can } = require('../middleware/auth');

router.use(authenticate, can('users.manage'));
router.get('/permissions', c.permissions); // antes de '/:id'
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.patch('/:id/toggle-status', c.toggleStatus);

module.exports = router;
