const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, httpError } = require('../utils/helpers');

const VIEWS = ['kanban', 'workspace', 'table'];
const THEMES = ['light', 'dark', 'system'];
const sign = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password').populate('tenant');
  if (!user || !(await argon2.verify(user.password, password))) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }
  if (!user.is_active) return res.status(403).json({ message: 'Usuário desativado. Procure o administrador.' });
  if (user.role !== 'superadmin' && !user.tenant?.is_active) {
    return res.status(403).json({ message: 'A assinatura desta assistência está inativa.' });
  }
  req.user = user; // para a auditoria registrar o login
  res.json({ token: sign(user), user });
});

// Troca um token ainda válido por um novo (renova a sessão)
exports.refresh = asyncHandler(async (req, res) => res.json({ token: sign(req.user), user: req.user }));

// Usuário logado com o assinante e as permissões (o front atualiza a sessão ao abrir)
exports.me = asyncHandler(async (req, res) => res.json(req.user));

exports.updatePreferences = asyncHandler(async (req, res) => {
  const { theme, orders_view, workspace_order } = req.body;
  if (theme !== undefined) {
    if (!THEMES.includes(theme)) throw httpError(400, 'Tema inválido');
    req.user.preferences.theme = theme;
  }
  if (orders_view !== undefined) {
    if (!VIEWS.includes(orders_view)) throw httpError(400, 'Visualização inválida');
    req.user.preferences.orders_view = orders_view;
  }
  if (workspace_order !== undefined) {
    if (!Array.isArray(workspace_order) || workspace_order.length > 1000) throw httpError(400, 'Ordem dos cards inválida');
    req.user.preferences.workspace_order = workspace_order;
  }
  await req.user.save();
  res.json(req.user);
});
