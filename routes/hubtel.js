const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

console.log("USER:", req.user);
// AUTH
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// PRICING
const PRICES = {
  monthly: 20,
  quarterly: 55,
  yearly: 200,
};

router.post('/hubtel/pay', auth, async (req, res) => {
  try {
    console.log("🔥 HUBTEL PAY HIT");
    console.log("BODY:", req.body); // ✅ correct place

    const { phone, plan } = req.body;

    if (!phone || !plan) {
      return res.status(400).json({ message: 'Phone and plan required' });
    }

    const prices = {
      monthly: 5,
      yearly: 50
    };

    const amount = prices[plan];

    if (!amount) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reference = `HUBTEL_${Date.now()}_${user._id}`;

    user.plan_type = plan;
    user.payment_reference = reference;
    user.payment_status = 'pending';
    await user.save();

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      `https://api.hubtel.com/v1/merchantaccount/merchants/transactions/initiate`,
      {
        totalAmount: amount,
        description: `${plan} subscription`,
        callbackUrl: process.env.HUBTEL_CALLBACK_URL,
        customerMsisdn: phone,
        clientReference: reference,
        channel: 'momo'
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.json({
      success: true,
      reference,
      hubtel: response.data
    });

  } catch (err) {
    console.error("🔥 HUBTEL ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: 'Payment failed' });
  }
});
// CALLBACK
router.post('/callback', async (req, res) => {
  try {
    const { clientReference, status } = req.body;

    const payment = await Payment.findOne({ payment_reference: clientReference });
    const user = await User.findOne({ payment_reference: clientReference });

    if (!payment || !user) return res.sendStatus(200);

    if (payment.status === "approved") return res.sendStatus(200);

    if (status?.toLowerCase() === "success") {
      let expiry = new Date();

      if (user.plan_type === "monthly") expiry.setMonth(expiry.getMonth() + 1);
      if (user.plan_type === "quarterly") expiry.setMonth(expiry.getMonth() + 3);
      if (user.plan_type === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);

      user.subscription_status = "active";
      user.subscription_expiry = expiry;
      user.payment_status = "completed";

      payment.status = "approved";

      await user.save();
      await payment.save();
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(200);
  }
});

// STATUS CHECK
router.get('/status/:ref', auth, async (req, res) => {
  try {
    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.get(
      `${process.env.BASE_URL}/merchant-account/merchants/transactions/${req.params.ref}`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: "status failed" });
  }
});

module.exports = router;