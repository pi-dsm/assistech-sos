const argon2 = require('argon2');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { PERMISSIONS } = require('../config/permissions');
const { asyncHandler, pick, httpError } = require('../utils/helpers');

const FIELDS = ['name', 'email', 'phone', 'permissions'];
const ROLES = ['admin', 'user']; // o admin da assistência não cria superadmin

const load = async (id) => {
  const user = await User.findById(id).select('+password');
  if (!user) throw httpError(404, 'Usuário não encontrado');
  return user;
};

// GET /users/permissions -> lista de permissões que o admin pode marcar
exports.permissions = asyncHandler(async (req, res) => {
  res.json(Object.entries(PERMISSIONS).map(([key, p]) => ({ key, label: p.label, group: p.group, default: !!p.default })));
});

exports.create = asyncHandler(async (req, res) => {
  const { password, role = 'user' } = req.body;
  if (!password || password.length < 6) throw httpError(400, 'Senha deve ter ao menos 6 caracteres');
  if (!ROLES.includes(role)) throw httpError(400, 'Perfil inválido');
  const limit = Tenant.PLANS[req.tenant.plan].max_users;
  if ((await User.countDocuments({ is_active: true })) >= limit) {
    throw httpError(409, `O plano ${Tenant.PLANS[req.tenant.plan].label} permite até ${limit} usuários ativos.`);
  }
  const user = await User.create({ ...pick(req.body, FIELDS), role, password: await argon2.hash(password) });
  res.status(201).json(user);
});

exports.list = asyncHandler(async (req, res) => res.json(await User.find().sort({ name: 1 })));

exports.get = asyncHandler(async (req, res) => res.json(await load(req.params.id)));

exports.update = asyncHandler(async (req, res) => {
  const user = await load(req.params.id);
  const self = String(user._id) === String(req.user._id);
  if (req.body.role !== undefined) {
    if (!ROLES.includes(req.body.role)) throw httpError(400, 'Perfil inválido');
    if (self && req.body.role !== user.role) throw httpError(400, 'Você não pode alterar o próprio perfil.');
    user.role = req.body.role;
  }
  user.set(pick(req.body, FIELDS));
  if (req.body.password) {
    if (req.body.password.length < 6) throw httpError(400, 'Senha deve ter ao menos 6 caracteres');
    user.password = await argon2.hash(req.body.password);
  }
  await user.save();
  res.json(user);
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const user = await load(req.params.id);
  if (String(user._id) === String(req.user._id)) throw httpError(400, 'Você não pode desativar o próprio acesso');
  user.is_active = !user.is_active;
  await user.save();
  res.json(user);
});
