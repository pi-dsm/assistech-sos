const mongoose = require('mongoose');
const { tenantPlugin } = require('../config/tenant');
const { escapeRegex, onlyDigits } = require('../utils/helpers');

const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: [true, 'Nome do cliente é obrigatório'], trim: true },
    phone: { type: String, required: [true, 'Telefone do cliente é obrigatório'], trim: true },
    phone_digits: { type: String, index: true }, // só números, para busca
    alternative_phone: { type: String, required: [true, 'Telefone para contato é obrigatório'], trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ name: 1 });

schema.pre('validate', function (next) {
  this.phone_digits = onlyDigits(this.phone);
  next();
});

// Filtro de busca reutilizado pela listagem de clientes e pela busca de OS.
schema.statics.searchFilter = function (q) {
  const rx = new RegExp(escapeRegex(q), 'i');
  const digits = onlyDigits(q);
  const or = [{ name: rx }, { phone: rx }];
  if (digits.length >= 3) or.push({ phone_digits: new RegExp(escapeRegex(digits)) });
  return { $or: or };
};

schema.plugin(tenantPlugin);
schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Customer', schema);