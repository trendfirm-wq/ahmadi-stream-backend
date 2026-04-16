const express = require('express');
const axios = require('axios');

const router = express.Router();

router.post('/pay', async (req, res) => {

  try {

    const { plan } = req.body;

    const PRICES = {
      monthly: 20,
      quarterly: 55,
      yearly: 200,
    };

    const amount = PRICES[plan];

    if (!amount) {
      return res.status(400).json({
        message: "Invalid plan"
      });
    }

    const reference = `INV_${Date.now()}`;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString("base64");

    const payload = {

      totalAmount: Number(amount.toFixed(2)),

      description: `${plan} subscription`,

      callbackUrl: process.env.HUBTEL_CALLBACK_URL,

      returnUrl: process.env.HUBTEL_RETURN_URL,

      cancellationUrl: process.env.HUBTEL_RETURN_URL,

      merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,

      clientReference: reference

    };

    console.log("🔥 HUBTEL REQUEST:", payload);

    const response = await axios.post(
      "https://payproxyapi.hubtel.com/items/initiate",
      payload,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("🔥 HUBTEL RESPONSE:", response.data);

    const checkoutUrl =
      response.data.data?.checkoutUrl;

    res.json({
      success: true,
      checkoutUrl,
      reference
    });

  }

  catch (err) {

    console.log(
      "🔥 HUBTEL ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      message: "Hubtel failed",
      error:
        err.response?.data || err.message
    });

  }

});

module.exports = router;