const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { runAs } = require('../config/tenant');

exports.authenticate = async (req, res, next) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ message: 'Token não informado' });
  let user;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    user = await User.findById(payload.id).populate('tenant');
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
  if (!user || !user.is_active) return res.status(401).json({ message: 'Usuário inválido ou desativado' });
  if (user.role !== 'superadmin' && !user.tenant?.is_active) {
    return res.status(403).json({ message: 'A assinatura desta assistência está inativa.' });
  }
  req.user = user;
  req.tenant = user.tenant; // documento do assinante (null para o superadmin)
  runAs(user.tenant, next); // daqui em diante as consultas filtram por este assinante
};

// Por perfil: authorize('admin'), authorize('superadmin')
exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Acesso negado' });

// Por permissão do usuário (o admin tem todas). Use: can('catalog.edit')
exports.can = (permission) => (req, res, next) =>
  req.user.can(permission) ? next() : res.status(403).json({ message: 'Você não tem permissão para esta ação' });
