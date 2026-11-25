const mongoose = require('mongoose');
const { ROLES, KEYS, DEFAULT_PERMISSIONS } = require('../config/permissions');
const { tenantPlugin } = require('../config/tenant');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    email: { type: String, required: [true, 'E-mail é obrigatório'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    alternative_phone: { type: String, trim: true },
    role: { type: String, enum: { values: ROLES, message: 'Perfil inválido' }, default: 'user' },
    // permissões do user, marcadas pelo admin (o admin tem todas)
    permissions: { type: [{ type: String, enum: { values: KEYS, message: 'Permissão desconhecida' } }], default: () => [...DEFAULT_PERMISSIONS] },
    is_active: { type: Boolean, default: true },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      orders_view: { type: String, enum: ['kanban', 'workspace', 'table'], default: 'kanban' },
      workspace_order: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.plugin(tenantPlugin); // o superadmin não tem assinante

schema.methods.can = function (permission) {
  return this.role === 'admin' || this.permissions.includes(permission);
};

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    if (doc.role === 'admin') ret.permissions = [...KEYS];
    return ret;
  },
});

module.exports = mongoose.model('User', schema);
