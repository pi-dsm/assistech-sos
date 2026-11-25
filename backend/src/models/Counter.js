const mongoose = require('mongoose');
const { currentTenant } = require('../config/tenant');

const schema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', schema);

// Numeração sequencial por assinante (cada assistência tem sua própria OS nº 1001)
async function nextSequence(name, start = 0) {
  const id = `${currentTenant() || 'global'}:${name}`;
  const doc = await Counter.findByIdAndUpdate(id, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return start + doc.seq;
}

module.exports = { Counter, nextSequence };
