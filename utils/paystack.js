const axios = require('axios');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// 🔑 Initialize payment
async function initializePayment(email, amount, metadata = {}) {
  const res = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: amount * 100,
      metadata // 🔥 THIS IS THE FIX
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return res.data.data;
}

// 🔍 Verify payment
async function verifyPayment(reference) {
  const res = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    }
  );

  return res.data.data;
}

module.exports = {
  initializePayment,
  verifyPayment,
};