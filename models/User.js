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

    subscription_status: {
        type: String,
        enum: ['inactive', 'active', 'expired'],
        default: 'inactive'
    },

    plan_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: null
}

    subscription_start: {
        type: Date,
        default: null
    },

    subscription_expiry: {
        type: Date,
        default: null
    },

    payment_reference: {
        type: String,
        default: null
    },

    // 🔥 ADD THESE TWO
    resetToken: {
        type: String,
        default: null
    },

    resetTokenExpiry: {
        type: Date,
        default: null
    },

    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);