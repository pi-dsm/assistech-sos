const mongoose = require('mongoose');
const { tenantPlugin } = require('../config/tenant');

const { Schema } = mongoose;

const CATEGORIES = ['accessory', 'stationery', 'keyboard', 'screen_protector', 'lighting', 'other'];
// Tipo do item no estoque: periférico (balcão), peça (OS ou venda) ou dispositivo (aparelho à venda)
const KINDS = ['peripheral', 'part', 'device'];

const schema = new Schema(
  {
    name: { type: String, required: [true, 'Nome do produto é obrigatório'], trim: true },
    barcode: { type: String, required: [true, 'Código de barras é obrigatório'], trim: true },
    kind: { type: String, enum: { values: KINDS, message: 'Tipo de produto inválido' }, default: 'peripheral', index: true },
    category: { type: String, enum: { values: CATEGORIES, message: 'Categoria inválida' }, default: 'other' },
    description: { type: String, trim: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    cost_price: { type: Number, min: [0, 'Custo inválido'], default: 0 },
    sale_price: { type: Number, required: [true, 'Preço de venda é obrigatório'], min: [0, 'Preço inválido'] },
    stock_quantity: {
      type: Number,
      min: [0, 'Estoque não pode ser negativo'],
      default: 0,
      validate: { validator: Number.isInteger, message: 'Estoque deve ser um número inteiro' },
    },
    min_stock: { type: Number, min: 0, default: 0 },
    location: { type: String, trim: true }, // local físico (ex.: gaveta 3 da bancada)
    show_in_showcase: { type: Boolean, default: false }, // aparece na vitrine pública
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ name: 1 });

schema.plugin(tenantPlugin);
schema.index({ tenant: 1, barcode: 1 }, { unique: true });
schema.virtual('is_low_stock').get(function () {
  return this.stock_quantity <= this.min_stock;
});

schema.set('toJSON', { virtuals: true, versionKey: false });

const Product = mongoose.model('Product', schema);
module.exports = Product;
module.exports.CATEGORIES = CATEGORIES;
module.exports.KINDS = KINDS;