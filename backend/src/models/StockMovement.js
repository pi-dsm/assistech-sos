const mongoose = require('mongoose');
const { tenantPlugin } = require('../config/tenant');

const { Schema } = mongoose;

const schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    kind: { type: String, enum: ['initial', 'sale', 'refund', 'adjustment', 'purchase'], required: true },
    quantity: { type: Number, required: true }, // com sinal: negativo = saída
    balance_after: { type: Number, required: true },
    reason: { type: String, trim: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' }, // compras
    unit_cost: { type: Number, min: 0 }, // compras
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

schema.plugin(tenantPlugin);
schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('StockMovement', schema);