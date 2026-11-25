const mongoose = require('mongoose');
const { ROLES, KEYS, effectivePermissions } = require('../config/permissions');

const overrideSchema = new mongoose.Schema(
  {
    key: { type: String, enum: { values: KEYS, message: 'Permissão desconhecida' }, required: true },
    allowed: { type: Boolean, required: true },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    email: { type: String, required: [true, 'E-mail é obrigatório'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    alternative_phone: { type: String, trim: true },
    role: { type: String, enum: { values: ROLES, message: 'Nível de acesso inválido' }, default: 'attendant' },
    // Exceções ao padrão do perfil: [{ key: 'catalog.edit', allowed: false }, { key: 'metrics.view', allowed: true }]
    permission_overrides: { type: [overrideSchema], default: [] },
    is_active: { type: Boolean, default: true },
    preferences: {
      orders_view: { type: String, enum: ['kanban', 'workspace', 'table'], default: 'kanban' },
      workspace_order: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Permissões efetivas (perfil + exceções)
schema.virtual('permissions').get(function () {
  return effectivePermissions(this.role, this.permission_overrides);
});
schema.methods.can = function (permission) {
  return this.permissions.includes(permission);
};

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', schema);
