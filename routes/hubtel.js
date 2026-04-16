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

router.post("/hubtel/pay", auth, async (req, res) => {
  try {
    const { amount, plan, phone } = req.body;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString("base64");

    const reference = `INV_${Date.now()}`;

    const response = await axios.post(
      "https://payproxyapi.hubtel.com/items/initiate",
      {
        totalAmount: Number(amount.toFixed(2)), // IMPORTANT (2 decimals rule)
        description: `${plan} subscription`,
        callbackUrl: process.env.HUBTEL_CALLBACK_URL,
        returnUrl: `${process.env.BASE_URL}/success`,
        cancellationUrl: `${process.env.BASE_URL}/cancel`,
        merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,
        clientReference: reference,
        payeeName: phone || "",
        payeeMobileNumber: phone || ""
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("HUBTEL RESPONSE:", response.data);

    return res.json({
      success: true,
      checkoutUrl: response.data.data.checkoutUrl,
      checkoutId: response.data.data.checkoutId,
      reference
    });

  } catch (err) {
    console.log("HUBTEL ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      message: "Payment initiation failed",
      error: err.response?.data || err.message
    });
  }
});
// =========================
// CALLBACK
// =========================
router.post('/callback', async (req, res) => {
  try {
    console.log("🔥 HUBTEL CALLBACK HIT");
console.log(req.body);
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