const User = require('../models/User');

const checkSubscription = async (req, res, next) => {
  try {
    // 1. Safety check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 2. Check active status
    if (user.subscription_status !== 'active') {
      return res.status(403).json({
        message: 'Subscription required'
      });
    }

    // 3. Check expiry safely
    if (user.subscription_expiry) {
      const now = new Date();

      if (new Date(user.subscription_expiry).getTime() < now.getTime()) {
        return res.status(403).json({
          message: 'Subscription expired'
        });
      }
    }

    // 4. Attach user to request (VERY IMPORTANT)
    req.subscriptionUser = user;

    next();

  } catch (err) {
    console.error("SUBSCRIPTION ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkSubscription;