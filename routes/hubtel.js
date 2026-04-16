const express = require('express');
const router = express.Router();

router.post('/pay', (req, res) => {

  console.log("🔥 HUBTEL PAY ROUTE HIT");

  res.json({
    message: "Hubtel pay route working"
  });

});

module.exports = router;