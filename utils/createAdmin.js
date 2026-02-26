const bcrypt = require('bcrypt');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const adminEmail = 'admin@montie.com';
    const adminPassword = 'MontieAdmin123!';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        full_name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        subscription_status: 'active'
      },
      { upsert: true }
    );

    console.log('✅ Admin ensured and password reset');

  } catch (error) {
    console.error('Admin creation error:', error);
  }
};

module.exports = createAdmin;