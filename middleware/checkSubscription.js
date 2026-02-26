const User = require('../models/User');

const checkSubscription = async (req, res, next) => {
  try {
    // req.user should come from your auth middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check expiry
    if (
      user.subscription_status !== 'active' ||
      (user.subscription_expiry && user.subscription_expiry < new Date())
    ) {
      return res.status(403).json({
        message: 'Subscription required'
      });
    }

    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkSubscription;
