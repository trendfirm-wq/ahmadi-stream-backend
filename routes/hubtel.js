const express = require('express');
const axios = require('axios');

const router = express.Router();

const User = require('../models/User');

// If you have auth middleware
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

    const amount = PRICES[plan];

    if (!amount) {

      return res.status(400).json({
        message: "Invalid plan"
      });

    }

    // Unique reference
    const reference =
      `INV_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString("base64");


    // =============================
    // SAVE PAYMENT INFO TO USER
    // =============================

    await User.findByIdAndUpdate(

      req.user.id,

      {

        payment_reference: reference,

        payment_status: "pending",

        plan_type: plan

      }

    );



    const payload = {

      totalAmount:
        Number(amount.toFixed(2)),

      description:
        `${plan} subscription`,

      callbackUrl:
        process.env.HUBTEL_CALLBACK_URL,

      returnUrl:
        process.env.HUBTEL_RETURN_URL,

      cancellationUrl:
        process.env.HUBTEL_RETURN_URL,

      merchantAccountNumber:
        process.env.HUBTEL_MERCHANT_ID,

      clientReference:
        reference

    };


    console.log(
      "🔥 HUBTEL REQUEST:",
      payload
    );



    const response = await axios.post(

      "https://payproxyapi.hubtel.com/items/initiate",

      payload,

      {

        headers: {

          Authorization:
            `Basic ${authHeader}`,

          "Content-Type":
            "application/json"

        }

      }

    );



    const checkoutUrl =
      response.data.data?.checkoutUrl;



    if (!checkoutUrl) {

      return res.status(500).json({

        message:
          "No checkout URL returned"

      });

    }



    res.json({

      success: true,

      checkoutUrl,

      reference

    });

  }

  catch (err) {

    console.log(
      "🔥 HUBTEL ERROR:",
      err.response?.data ||
      err.message
    );



    res.status(500).json({

      message: "Hubtel failed",

      error:
        err.response?.data ||
        err.message

    });

  }

});



// ===================================================
// 2️⃣ CALLBACK — ACTIVATE SUBSCRIPTION
// ===================================================

router.post('/callback', async (req, res) => {

  try {

    console.log(

      "🔥 HUBTEL CALLBACK:",

      JSON.stringify(
        req.body,
        null,
        2
      )

    );



    const data = req.body;



    if (

      data.status === "Success" ||
      data.status === "Successful" ||
      data.status === "Paid"

    ) {

      const reference =
        data.clientReference;



      console.log(
        "✅ PAYMENT SUCCESS:",
        reference
      );



      // ===========================
      // FIND USER BY REFERENCE
      // ===========================

      const user =
        await User.findOne({

          payment_reference:
            reference

        });



      if (!user) {

        console.log(
          "❌ User not found"
        );

        return res.sendStatus(200);

      }



      // Prevent double activation

      if (
        user.payment_status === "completed"
      ) {

        console.log(
          "⚠️ Already processed"
        );

        return res.sendStatus(200);

      }



      // ===========================
      // CALCULATE START DATE
      // ===========================

      let startDate =
        new Date();



      // If still active → extend

      if (

        user.subscription_expiry &&

        user.subscription_expiry > new Date()

      ) {

        startDate =
          user.subscription_expiry;

      }



      // ===========================
      // CALCULATE EXPIRY
      // ===========================

      const days =
        PLAN_DAYS[user.plan_type];



      const expiryDate =
        new Date(startDate);

      expiryDate.setDate(

        startDate.getDate()
        + days

      );



      // ===========================
      // UPDATE USER SUBSCRIPTION
      // ===========================

      user.subscription_status =
        "active";

      user.subscription_start =
        startDate;

      user.subscription_expiry =
        expiryDate;

      user.payment_status =
        "completed";



      await user.save();



      console.log(
        "🎉 SUBSCRIPTION ACTIVATED:",
        user._id
      );

    }



    res.sendStatus(200);

  }

  catch (err) {

    console.log(
      "🔥 CALLBACK ERROR:",
      err.message
    );

    res.sendStatus(500);

  }

});



// ===================================================
// 3️⃣ PAYMENT STATUS CHECK
// ===================================================

router.get(
  '/status/:reference',
  auth,
  async (req, res) => {

    try {

      const reference =
        req.params.reference;



      const user =
        await User.findOne({

          payment_reference:
            reference

        });



      if (!user) {

        return res.status(404).json({

          message:
            "Payment not found"

        });

      }



      res.json({

        payment_status:
          user.payment_status,

        subscription_status:
          user.subscription_status,

        expiry:
          user.subscription_expiry

      });

    }

    catch (err) {

      console.log(
        "🔥 STATUS ERROR:",
        err.message
      );



      res.status(500).json({

        message:
          "Status check failed"

      });

    }

  }

);

module.exports = router;