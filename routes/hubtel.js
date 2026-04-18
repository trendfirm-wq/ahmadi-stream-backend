const express = require('express');
const axios = require('axios');

const router = express.Router();

const User = require('../models/User');
const auth = require('../middleware/auth');

// =============================
// PLAN PRICES
// =============================
const PRICES = {
  monthly: 20,
  quarterly: 55,
  yearly: 200,
};

// =============================
// PLAN DURATIONS
// =============================
const PLAN_DAYS = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

// ===================================================
// 1️⃣ CREATE PAYMENT
// ===================================================
router.post('/pay', auth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PRICES[plan]) {
      return res.status(400).json({
        message: 'Invalid plan',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // =============================
    // AUTO EXPIRE IF OLD SUB ENDED
    // =============================
    if (
      user.subscription_status === 'active' &&
      user.subscription_expiry &&
      new Date(user.subscription_expiry) <= new Date()
    ) {
      user.subscription_status = 'expired';
      await user.save();
    }

    // =============================
    // BLOCK SAME ACTIVE PLAN
    // =============================
    if (
      user.subscription_status === 'active' &&
      user.plan_type === plan &&
      user.subscription_expiry &&
      new Date(user.subscription_expiry) > new Date()
    ) {
      return res.status(400).json({
        message: 'You already have this active plan',
      });
    }

    const amount = PRICES[plan];

    const reference = `INV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    // =============================
    // SAVE PAYMENT INFO TO USER
    // DO NOT CHANGE LIVE plan_type YET
    // =============================
    user.payment_reference = reference;
    user.payment_status = 'pending';
    user.pending_plan_type = plan; // optional if your schema has it
    await user.save();

    const payload = {
      totalAmount: Number(amount.toFixed(2)),
      description: `${plan} subscription`,
      callbackUrl: process.env.HUBTEL_CALLBACK_URL,
      returnUrl: process.env.HUBTEL_RETURN_URL,
      cancellationUrl: process.env.HUBTEL_RETURN_URL,
      merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,
      clientReference: reference,
    };

    console.log('🔥 HUBTEL REQUEST:', payload);

    const response = await axios.post(
      'https://payproxyapi.hubtel.com/items/initiate',
      payload,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('🔥 HUBTEL RESPONSE:', response.data);

    const checkoutUrl = response.data?.data?.checkoutUrl;

    if (!checkoutUrl) {
      return res.status(500).json({
        message: 'No checkout URL returned',
      });
    }

    res.json({
      success: true,
      checkoutUrl,
      reference,
    });
  } catch (err) {
    console.log('🔥 HUBTEL ERROR:', err.response?.data || err.message);

    res.status(500).json({
      message: 'Hubtel failed',
      error: err.response?.data || err.message,
    });
  }
});

// ===================================================
// 2️⃣ CALLBACK — ACTIVATE SUBSCRIPTION
// ===================================================
router.post('/hubtel/callback', async (req, res) => {
  try {
    console.log('🔥 HUBTEL CALLBACK BODY:', req.body);

    const reference =
      req.body.clientReference ||
      req.body.ClientReference ||
      req.body.Data?.ClientReference ||
      req.body.data?.clientReference;

    const status =
      req.body.status ||
      req.body.Status ||
      req.body.Data?.Status ||
      req.body.data?.status;

    console.log('🔥 Extracted reference:', reference);
    console.log('🔥 Extracted status:', status);

    if (!reference) {
      return res.status(400).json({ message: 'No reference in callback' });
    }

    const user = await User.findOne({ payment_reference: reference });

    if (!user) {
      console.log('❌ No user found for reference:', reference);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Found user:', user.email);

    const paid =
      String(status).toLowerCase() === 'success' ||
      String(status).toLowerCase() === 'successful' ||
      String(status).toLowerCase() === 'paid';

    if (paid) {
      const start = new Date();
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);

      user.subscription_status = 'active';
      user.plan_type = 'monthly';
      user.subscription_start = start;
      user.subscription_expiry = expiry;
      user.is_premium = true;

      await user.save();

      console.log('✅ USER UPDATED TO PREMIUM:', user.email);
    } else {
      console.log('⚠️ Payment not marked successful:', status);
    }

    return res.status(200).json({ message: 'Callback received' });
  } catch (error) {
    console.error('🔥 CALLBACK ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ===================================================
// 3️⃣ PAYMENT STATUS CHECK
// ===================================================
router.get('/status/:reference', auth, async (req, res) => {
  try {
    const reference = req.params.reference;

    const user = await User.findOne({
      _id: req.user.id,
      payment_reference: reference,
    });

    if (!user) {
      return res.status(404).json({
        message: 'Payment not found',
      });
    }

    // auto-expire here too
    if (
      user.subscription_status === 'active' &&
      user.subscription_expiry &&
      new Date(user.subscription_expiry) <= new Date()
    ) {
      user.subscription_status = 'expired';
      await user.save();
    }

    res.json({
      payment_status: user.payment_status,
      subscription_status: user.subscription_status,
      plan_type: user.plan_type,
      subscription_start: user.subscription_start,
      subscription_expiry: user.subscription_expiry,
      payment_reference: user.payment_reference,
    });
  } catch (err) {
    console.log('🔥 STATUS ERROR:', err.message);

    res.status(500).json({
      message: 'Status check failed',
    });
  }
});

module.exports = router;