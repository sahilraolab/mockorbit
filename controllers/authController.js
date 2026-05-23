const User = require('../models/User');
const { generateOTP, sendEmailOTP } = require('../services/emailOtpService');

const OTP_TTL_MS = 10 * 60 * 1000;

function otpExpiresAt() {
  return new Date(Date.now() + OTP_TTL_MS);
}

exports.showLogin = (req, res) => {
  res.render('login', {
    title: 'Login — MockOrbit',
    returnTo: req.session.returnTo || '/dashboard',
    error:   req.flash('error'),
    success: req.flash('success')
  });
};

exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    const normalEmail = email.trim().toLowerCase();
    const otp = generateOTP();
    await User.findOneAndUpdate(
      { email: normalEmail },
      { email: normalEmail, otp: { code: otp, expiresAt: otpExpiresAt() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await sendEmailOTP(normalEmail, otp);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('[Auth] sendEmailOTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }
    const normalEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalEmail });
    if (!user)                           return res.status(400).json({ success: false, message: 'Email not found. Please request OTP again.' });
    if (!user.otp?.code)                 return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (new Date() > user.otp.expiresAt) return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    if (user.otp.code !== otp.trim())    return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    user.otp = undefined;
    await user.save();
    req.session.userId = user._id;
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.json({ success: true, redirect: returnTo });
  } catch (err) {
    console.error('[Auth] verifyEmailOTP error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};
