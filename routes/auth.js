const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const authMiddleware = require('../middleware/auth');
const auth = require('../middleware/auth');
dotenv.config();


// ===== REGISTER USER =====
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, phone, password } = req.body;

        // Check required fields
        if (!full_name || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required.' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user (role defaults to "user")
        const newUser = new User({
            full_name,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('REGISTER ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ===== LOGIN USER =====
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Create JWT payload (⭐ includes role)
        const payload = {
            id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            subscription_status: user.subscription_status
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({
            message: 'Login successful!',
            token
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
 
// ===== CHANGE PASSWORD =====
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    // Find user from token
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }

    // Hash new password
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
  const user = await User.findById(req.user.id);

  user.full_name = req.body.full_name;
  user.email = req.body.email;

  await user.save();

  res.json({ success: true });
});
// ===== FORGOT PASSWORD =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    res.json({
      message: 'Reset token generated',
      resetToken
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
      resetTokenExpiry: { $gt: Date.now() }
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
module.exports = router;