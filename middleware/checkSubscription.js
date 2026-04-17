const User = require('../models/User');

const checkSubscription = async (req, res, next) => {

  try {

    // =========================
    // 1. AUTH CHECK
    // =========================

    if (!req.user || !req.user.id) {

      return res.status(401).json({
        message: 'Unauthorized'
      });

    }

    const user =
      await User.findById(req.user.id);

    if (!user) {

      return res.status(401).json({
        message: 'User not found'
      });

    }

    // =========================
    // 2. ADMIN BYPASS (VERY IMPORTANT)
    // =========================

    if (user.role === 'admin') {

      req.subscriptionUser = user;

      return next();

    }

    // =========================
    // 3. CHECK ACTIVE STATUS
    // =========================

    if (user.subscription_status !== 'active') {

      return res.status(403).json({
        message: 'Subscription required'
      });

    }

    // =========================
    // 4. CHECK EXPIRY
    // =========================

    if (user.subscription_expiry) {

      const now = new Date();

      const expiry =
        new Date(user.subscription_expiry);

      if (expiry.getTime() < now.getTime()) {

        // 🔥 AUTO MARK EXPIRED

        user.subscription_status = 'expired';

        await user.save();

        return res.status(403).json({
          message: 'Subscription expired'
        });

      }

    }

    // =========================
    // 5. ATTACH USER
    // =========================

    req.subscriptionUser = user;

    next();

  }

  catch (err) {

    console.error(
      "SUBSCRIPTION ERROR:",
      err.message
    );

    res.status(500).json({
      message: 'Server error'
    });

  }

};

module.exports = checkSubscription;