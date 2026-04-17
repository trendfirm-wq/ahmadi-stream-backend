const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({

  // =========================
  // USER LINK
  // =========================

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // =========================
  // PAYMENT DETAILS
  // =========================

  amount: {
    type: Number,
    required: true
  },

  payment_reference: {
    type: String,
    required: true,
    unique: true // 🔥 prevents duplicate payments
  },

  plan: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'], // 🔥 FIXED
    required: true
  },

  provider: {
    type: String,
    default: 'hubtel'
  },

  // =========================
  // PAYMENT STATUS
  // =========================

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // =========================
  // OPTIONAL HUBTEL DATA
  // =========================

  metadata: {
    type: Object,
    default: null
  }

}, {

  timestamps: true // createdAt & updatedAt

});

module.exports =
  mongoose.model('Payment', paymentSchema);