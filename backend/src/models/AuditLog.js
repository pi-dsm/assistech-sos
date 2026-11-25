const mongoose = require('mongoose');

// Auditoria: quem fez o quê e quando. Gravado pelo middleware do server.js em toda alteração.
const schema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_name: String,
    method: String,
    route: String, // padrão da rota, ex.: /api/v1/sales/:id/refund
    path: String,
    entity_id: String,
    body: mongoose.Schema.Types.Mixed,
    status: Number,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
schema.index({ tenant: 1, created_at: -1 });
schema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('AuditLog', schema);
