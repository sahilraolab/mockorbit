const User = require('../models/User');
const { generateOTP, sendOTP } = require('../services/otpService');

exports.showLogin = (req, res) => {
  res.render('login', {
    title: 'Login',
    returnTo: req.session.returnTo || '/dashboard',
    error: req.flash('error'),
    success: req.flash('success')
  });
};

exports.sendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findOneAndUpdate(
      { mobile },
      { mobile, otp: { code: otp, expiresAt } },
      { upsert: true, new: true }
    );

    await sendOTP(mobile, otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found. Please request OTP again.' });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new OTP.' });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    await user.save();

    req.session.userId = user._id;

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;

    res.json({ success: true, redirect: returnTo });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Try again.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
