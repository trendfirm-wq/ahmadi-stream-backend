const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  amount: { type: Number, required: true },

  payment_reference: { type: String, required: true },

  plan: { type: String, enum: ['monthly', 'yearly'] },

  provider: { type: String, default: 'hubtel' }, // 🔥 important

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  metadata: { type: Object }, // 🔥 optional flexible storage

}, {
  timestamps: true // replaces created_at automatically
});

module.exports = mongoose.model('Payment', paymentSchema);