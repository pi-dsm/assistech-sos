const mongoose = require('mongoose');

// Planos da assinatura (valores mensais)
const PLANS = {
  basic: { label: 'Básico', price: 79.9, max_users: 2 },
  pro: { label: 'Profissional', price: 149.9, max_users: 5 },
};

const schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome da assistência é obrigatório'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^[a-z0-9-]{3,40}$/, 'Endereço da vitrine inválido (use letras, números e hífen)'] },
    plan: { type: String, enum: Object.keys(PLANS), default: 'pro' },
    is_active: { type: Boolean, default: true },
    deactivated_at: Date,
    // dados da loja (comprovantes e vitrine)
    document: { type: String, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    address: { type: String, trim: true },
    warranty_days: { type: Number, min: 0, default: 90 },
    showcase: {
      enabled: { type: Boolean, default: true },
      headline: { type: String, trim: true },
      about: { type: String, trim: true },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.virtual('plan_info').get(function () {
  return PLANS[this.plan];
});
schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Tenant', schema);
module.exports.PLANS = PLANS;
