const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login', c.login);
router.post('/refresh-token', authenticate, c.refresh);
router.get('/me', authenticate, c.me);
router.patch('/me/preferences', authenticate, c.updatePreferences);

module.exports = router;
