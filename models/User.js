const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

  full_name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  phone: { type: String },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // =========================
  // SUBSCRIPTION SYSTEM
  // =========================
  subscription_status: {
    type: String,
    enum: ['inactive', 'active', 'expired'],
    default: 'inactive'
  },

  plan_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: null
  },

  subscription_start: { type: Date, default: null },

  subscription_expiry: { type: Date, default: null },

  // =========================
  // PAYMENT TRACKING
  // =========================
  payment_reference: { type: String, default: null },

  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },

  // =========================
  // PASSWORD RESET
  // =========================
  resetToken: { type: String, default: null },

  resetTokenExpiry: { type: Date, default: null }

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);