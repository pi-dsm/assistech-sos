const mongoose = require('mongoose');
const { tenantPlugin } = require('../config/tenant');

const { Schema } = mongoose;

const schema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.plugin(tenantPlugin);
schema.index({ tenant: 1, key: 1 }, { unique: true });
module.exports = mongoose.model('Setting', schema);