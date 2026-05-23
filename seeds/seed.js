require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Admin } = require('../models/Attempt');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepflow';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear all data
  await Promise.all([
    Exam.deleteMany({}),
    TestSeries.deleteMany({}),
    Test.deleteMany({}),
    Question.deleteMany({}),
    Admin.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ─── Admin ───────────────────────────────────────────────
  const admin = new Admin({
    email: process.env.ADMIN_EMAIL || 'admin@mockorbit.com',
    name: 'Super Admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  });
  await admin.save();

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log('Add exams, series, tests and questions from the admin panel.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch(err => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => mongoose.disconnect());
