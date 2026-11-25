const mongoose = require('mongoose');
const { tenantPlugin } = require('../config/tenant');

const { Schema } = mongoose;

// 'AAAA-MM-DD' = data única | 'MM-DD' = repete todo ano
const isValidDate = (value) => {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Number(m[1] || 2024), month - 1, day); // 2024 é bissexto: aceita 02-29
  return probe.getMonth() === month - 1 && probe.getDate() === day;
};

const schema = new Schema(
  {
    date: {
      type: String,
      required: [true, 'Data do feriado é obrigatória'],
      validate: { validator: isValidDate, message: 'Data de feriado inválida (use AAAA-MM-DD ou MM-DD)' },
    },
    name: { type: String, required: [true, 'Nome do feriado é obrigatório'], trim: true },
    scope: { type: String, enum: ['state', 'municipal', 'optional'], default: 'municipal' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

schema.plugin(tenantPlugin);
schema.index({ tenant: 1, date: 1 }, { unique: true });
schema.virtual('recurring').get(function () {
  return this.date.length === 5;
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Holiday', schema);