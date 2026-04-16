const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');

const User = require('../models/User');
const Track = require('../models/Track');
const Artist = require('../models/Artist');
const Stream = require('../models/Stream');
const Payment = require('../models/Payment');

dotenv.config();

// =========================
// AUTH MIDDLEWARE
// =========================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// =========================
// HUBTEL PAYMENT INIT
// =========================
router.post('/hubtel/pay', auth, async (req, res) => {
  try {
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

    // 🔥 CREATE REFERENCE FIRST (FIXED)
    const reference = `HUBTEL_${Date.now()}_${user._id}`;

    // Save user intent
    user.plan_type = plan;
    user.payment_reference = reference;
    user.payment_status = 'pending';
    await user.save();

    // Save payment record
    await Payment.create({
      user: user._id,
      amount,
      plan,
      payment_reference: reference,
      status: 'pending',
      provider: 'hubtel'
    });

    // Hubtel auth
    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      `${process.env.BASE_URL}/merchant-account/merchants/transactions/initiate`,
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

    res.json({
      success: true,
      reference,
      hubtel: response.data
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Payment failed' });
  }
});

// =========================
// HUBTEL CALLBACK
// =========================
router.post('/hubtel/callback', async (req, res) => {
  try {
    const data = req.body;

    console.log("HUBTEL CALLBACK:", data);

    const reference = data.clientReference;
    const status = data.status?.toLowerCase();

    if (!reference) return res.sendStatus(200);

    const user = await User.findOne({ payment_reference: reference });
    if (!user) return res.sendStatus(200);

    const payment = await Payment.findOne({ payment_reference: reference });
    if (!payment) return res.sendStatus(200);

    // prevent duplicate processing
    if (payment.status === 'approved') return res.sendStatus(200);

    if (status === 'success' || status === 'successful') {

      let expiry = new Date();

      if (user.plan_type === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
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

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// =========================
// CHECK PAYMENT STATUS
// =========================
router.get('/hubtel/status/:transactionId', async (req, res) => {
  try {
    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.get(
      `${process.env.BASE_URL}/merchant-account/merchants/transactions/${req.params.transactionId}`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Status check failed' });
  }
});

// =========================
// STREAM PROTECTION
// =========================
router.get('/stream/:id', auth, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    if (track.is_premium) {
      const user = await User.findById(req.user.id);

      if (
        !user ||
        user.subscription_status !== 'active' ||
        (user.subscription_expiry && user.subscription_expiry < new Date())
      ) {
        return res.status(403).json({
          message: 'Subscription required'
        });
      }
    }

    track.total_streams += 1;
    await track.save();

    const mediaUrl = track.type === 'video'
      ? track.video_url
      : track.file_path;

    res.redirect(mediaUrl);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;