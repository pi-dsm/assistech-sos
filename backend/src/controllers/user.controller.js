const argon2 = require('argon2');
const User = require('../models/User');
const { PERMISSIONS, ROLES, overridesToObject } = require('../config/permissions');
const { asyncHandler, pick, httpError } = require('../utils/helpers');

const isOwner = (u) => u?.role === 'owner';

// Só a dona do sistema cria, edita ou desativa outra conta de dona do sistema
function guardOwner(actor, target, nextRole) {
  if ((isOwner(target) || nextRole === 'owner') && !isOwner(actor)) {
    throw httpError(403, 'Apenas a dona do sistema pode gerenciar contas de dona do sistema.');
  }
}

// { chave: true | false | null } -> exceções do usuário (null remove a exceção e volta ao padrão do perfil)
function applyOverrides(user, overrides) {
  if (!overrides || typeof overrides !== 'object') return;
  const current = overridesToObject(user.permission_overrides);
  for (const [key, value] of Object.entries(overrides)) {
    if (!PERMISSIONS[key]) throw httpError(400, `Permissão desconhecida: ${key}`);
    if (value === true || value === false) current[key] = value;
    else delete current[key];
  }
  user.permission_overrides = Object.entries(current).map(([key, allowed]) => ({ key, allowed }));
}

// GET /users/permissions -> catálogo de permissões e padrões por perfil
exports.permissions = asyncHandler(async (req, res) => {
  res.json({
    roles: ROLES,
    permissions: Object.entries(PERMISSIONS).map(([key, p]) => ({ key, label: p.label, group: p.group, roles: p.roles })),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres' });
  guardOwner(req.user, null, req.body.role);
  const user = new User({
    ...pick(req.body, ['name', 'email', 'phone', 'role']),
    password: await argon2.hash(password),
  });
  applyOverrides(user, req.body.permission_overrides);
  await user.save();
  res.status(201).json(user);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await User.find().sort({ name: 1 }));
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  guardOwner(req.user, user, req.body.role);
  if (String(user._id) === String(req.user._id) && req.body.role && req.body.role !== user.role) {
    throw httpError(400, 'Você não pode alterar o próprio nível de acesso.');
  }
  user.set(pick(req.body, ['name', 'email', 'phone', 'role', 'is_active']));
  applyOverrides(user, req.body.permission_overrides);
  if (req.body.password) {
    if (req.body.password.length < 6) return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres' });
    user.password = await argon2.hash(req.body.password);
  }
  await user.save();
  res.json(user);
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'Você não pode desativar o próprio acesso' });
  }
  guardOwner(req.user, user);
  user.is_active = !user.is_active;
  await user.save();
  res.json(user);
});
