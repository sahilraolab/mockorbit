require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepflow';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected:', MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`\n🚀 ${process.env.APP_NAME || 'PrepFlow'} is running!`);
      console.log(`   App:   http://localhost:${PORT}`);
      console.log(`   Admin: http://localhost:${PORT}/admin/login`);
      console.log(`   Mode:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`   OTP:   ${process.env.USE_MOCK_OTP === 'true' ? 'Mock (console)' : 'Twilio SMS'}`);
      console.log(`   Pay:   ${process.env.USE_MOCK_PAYMENT === 'true' ? 'Mock (dev)' : 'Razorpay'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
