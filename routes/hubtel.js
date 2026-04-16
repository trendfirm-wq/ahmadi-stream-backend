const express = require('express');
const router = express.Router();
const User = require('../models/User');

// (You will later import hubtel utils here)
// const { hubtelPay, hubtelStatus } = require('../utils/hubtel');


// =======================================
// POST /hubtel/pay
// Start payment
// =======================================

router.post('/pay', async (req, res) => {
  try {
    const { phone, plan } = req.body;

    if (!phone || !plan) {
      return res.status(400).json({
        message: 'Phone and plan required'
      });
    }

    // Determine amount
    let amount;

    if (plan === 'monthly') amount = 5;
    else if (plan === 'quarterly') amount = 15;
    else if (plan === 'yearly') amount = 50;
    else {
      return res.status(400).json({
        message: 'Invalid plan'
      });
    }

    // 🔥 Temporary reference generator
    const reference =
      "HB_" + Date.now();

    console.log("Hubtel Pay Request:");
    console.log({
      phone,
      amount,
      reference
    });

    // TODO: Call Hubtel API here later

    res.json({
      message: "Payment initiated",
      reference
    });

  } catch (err) {
    console.error("Hubtel Pay Error:", err);
    res.status(500).json({
      message: "Payment initiation failed"
    });
  }
});



// =======================================
// POST /hubtel/callback
// Hubtel sends payment result
// =======================================

router.post('/callback', async (req, res) => {
  try {
    const data = req.body;

    console.log("Hubtel Callback Received:");
    console.log(data);

    const {
      status,
      reference,
      phone
    } = data;

    if (status === "SUCCESSFUL") {

      // Find user (you may change logic later)
      const user = await User.findOne({
        phone: phone
      });

      if (user) {

        let expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);

        user.subscription_status = "active";
        user.subscription_expiry = expiry;

        await user.save();

        console.log("User subscription activated");
      }
    }

    // Always respond 200 to Hubtel
    res.sendStatus(200);

  } catch (err) {
    console.error("Hubtel Callback Error:", err);
    res.sendStatus(500);
  }
});



// =======================================
// GET /hubtel/status/:reference
// Check payment manually
// =======================================

router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    console.log("Checking Hubtel status:", reference);

    // TODO: Call Hubtel status API later

    res.json({
      reference,
      status: "PENDING" // placeholder
    });

  } catch (err) {
    console.error("Hubtel Status Error:", err);

    res.status(500).json({
      message: "Status check failed"
    });
  }
});


module.exports = router;