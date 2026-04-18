const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const auth = require('../middleware/auth');
const crypto = require('crypto');

dotenv.config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      plan_type: user.plan_type,
      subscription_expiry: user.subscription_expiry,
      cancel_at_expiry: user.cancel_at_expiry,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ===== REGISTER USER =====
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: 'Full name, email, and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || '',
      password: hashedPassword,
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        subscription_status: newUser.subscription_status,
        plan_type: newUser.plan_type,
        subscription_start: newUser.subscription_start,
        subscription_expiry: newUser.subscription_expiry,
        cancel_at_expiry: newUser.cancel_at_expiry,
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== LOGIN USER =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        subscription_start: user.subscription_start,
        subscription_expiry: user.subscription_expiry,
        cancel_at_expiry: user.cancel_at_expiry,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== CHANGE PASSWORD =====
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/update-profile', auth, async (req, res) => {
  try {
    const { full_name, email } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        message: 'Full name and email are required',
      });
    }

    const trimmedName = full_name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔥 LIMIT SETTINGS
    const LIMIT = 3;
    const WINDOW_DAYS = 30;
    const now = new Date();

    // Initialize if not set
    if (!user.profile_update_window_start) {
      user.profile_update_window_start = now;
      user.profile_update_count = 0;
    }

    const diffDays =
      (now - new Date(user.profile_update_window_start)) /
      (1000 * 60 * 60 * 24);

    // Reset after window
    if (diffDays > WINDOW_DAYS) {
      user.profile_update_window_start = now;
      user.profile_update_count = 0;
    }

    // 🔥 CHECK IF NO CHANGE
    if (
      user.full_name === trimmedName &&
      user.email === normalizedEmail
    ) {
      return res.json({ message: 'No changes detected' });
    }

    // 🔥 LIMIT CHECK
    if (user.profile_update_count >= LIMIT) {
      return res.status(429).json({
        message: `You can only update your profile ${LIMIT} times every ${WINDOW_DAYS} days.`,
      });
    }

    // 🔥 EMAIL DUPLICATE CHECK
    const existingEmailUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingEmailUser) {
      return res.status(400).json({
        message: 'Email is already in use by another account',
      });
    }

    // ✅ UPDATE
    user.full_name = trimmedName;
    user.email = normalizedEmail;
    user.profile_update_count += 1;

    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Profile updated (${user.profile_update_count}/${LIMIT})`,
      token,
    });

  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ===== FORGOT PASSWORD =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15;
    await user.save();

    res.json({
      message: 'Reset token generated',
      resetToken,
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== RESET PASSWORD =====
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== CURRENT USER =====
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('ME ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;