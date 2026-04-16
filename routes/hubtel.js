const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Payment = require('../models/Payment');

// =========================
// AUTH MIDDLEWARE (FIXED)
// =========================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 SAFE NORMALIZATION
    req.user = {
      id: decoded.id || decoded._id,
      email: decoded.email
    };

    if (!req.user.id) {
      return res.status(401).json({ message: 'Invalid token payload (missing id)' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// =========================
// PRICING
// =========================
const PRICES = {
  monthly: 20,
  quarterly: 55,
  yearly: 200,
};

// =========================
// INITIATE PAYMENT
// =========================
router.post("/hubtel/pay", async (req, res) => {
  try {
    const { plan } = req.body;

    const amount = PRICES[plan];

    const reference = `${req.user.id}-${Date.now()}`;

    const hubtelAuth = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString("base64");

    await User.findByIdAndUpdate(req.user.id, {
      payment_reference: reference,
      plan_type: plan
    });

    const response = await axios.post(
      "https://payproxyapi.hubtel.com/items/initiate",
      {
        totalAmount: amount,
        description: `${plan} subscription`,
        callbackUrl: `${process.env.BASE_URL}/hubtel/callback`,
        returnUrl: `${process.env.BASE_URL}/success`,
        merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,
        clientReference: reference
      },
      {
        headers: {
          Authorization: `Basic ${hubtelAuth}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.log("HUBTEL ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Hubtel initiation failed" });
  }
});
// =========================
// CALLBACK
// =========================
router.post('/callback', async (req, res) => {
  try {
    const { clientReference, status } = req.body;

    if (!clientReference) return res.sendStatus(200);

    const user = await User.findOne({ payment_reference: clientReference });
    const payment = await Payment.findOne({ payment_reference: clientReference });

    if (!user || !payment) return res.sendStatus(200);

    if (payment.status === 'approved') return res.sendStatus(200);

    const cleanStatus = status?.toLowerCase();

    if (cleanStatus === 'success' || cleanStatus === 'successful') {

      let expiry = new Date();

      if (user.plan_type === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else if (user.plan_type === 'quarterly') {
        expiry.setMonth(expiry.getMonth() + 3);
      } else if (user.plan_type === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
      }

      user.subscription_status = 'active';
      user.subscription_expiry = expiry;
      user.payment_status = 'completed';

      payment.status = 'approved';

      await user.save();
      await payment.save();

      console.log("✅ SUBSCRIPTION ACTIVATED:", user.email);
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error("🔥 CALLBACK ERROR:", err);
    return res.sendStatus(200);
  }
});

// =========================
// STATUS CHECK
// =========================
router.get('/status/:ref', auth, async (req, res) => {
  try {
    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.get(
      `https://api.hubtel.com/v1/merchantaccount/merchants/transactions/${req.params.ref}`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`
        }
      }
    );

    return res.json(response.data);

  } catch (err) {
    console.error("STATUS ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      message: 'Status check failed',
      error: err.response?.data || err.message
    });
  }
});

module.exports = router;