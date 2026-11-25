const mongoose = require('mongoose');
const { round2 } = require('../utils/money');

const { Schema } = mongoose;

const rowSchema = new Schema(
  {
    method: { type: String, required: true },
    expected: { type: Number, default: 0 }, // sistema (inclui fundo de troco no dinheiro)
    counted: { type: Number, required: [true, 'Informe o valor contado'] },
    difference: { type: Number, default: 0 }, // contado - esperado (negativo = quebra)
  },
  { _id: false }
);

// Fechamento de caixa de um dia (um por dia; refazer substitui o anterior)
const schema = new Schema(
  {
    day: { type: String, required: true, unique: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Dia inválido (use AAAA-MM-DD)'] },
    opening_float: { type: Number, min: [0, 'Fundo de troco inválido'], default: 0 },
    rows: { type: [rowSchema], default: [] },
    expected_total: { type: Number, default: 0 },
    counted_total: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    closed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.pre('validate', function (next) {
  this.rows.forEach((r) => {
    r.expected = round2(r.expected);
    r.counted = round2(r.counted);
    r.difference = round2(r.counted - r.expected);
  });
  this.expected_total = round2(this.rows.reduce((s, r) => s + r.expected, 0));
  this.counted_total = round2(this.rows.reduce((s, r) => s + r.counted, 0));
  this.difference = round2(this.counted_total - this.expected_total);
  next();
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('CashClosing', schema);
