require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Admin, Attempt, Payment } = require('../models/Attempt');
const User = require('../models/User');

// Optional models — only cleared if they exist in the project
let Organization, OrgStudent, Testimonial;
try { ({ Organization, OrgStudent } = require('../models/Organization')); } catch (_) {}
try { Testimonial = require('../models/Testimonial'); } catch (_) {}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepflow';

// ── Credentials ─────────────────────────────────────────────────────────────
// Override via env vars: ADMIN_EMAIL, ADMIN_PASSWORD
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@mockorbit.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'M0ck#Orb1t$2026';
const ADMIN_NAME     = 'Super Admin';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'));

  // ── Clear EVERY collection ─────────────────────────────────────────────────
  const clears = [
    Exam.deleteMany({}),
    TestSeries.deleteMany({}),
    Test.deleteMany({}),
    Question.deleteMany({}),
    Admin.deleteMany({}),
    Attempt.deleteMany({}),
    Payment.deleteMany({}),
    User.deleteMany({}),
  ];
  if (Organization) clears.push(Organization.deleteMany({}));
  if (OrgStudent)   clears.push(OrgStudent.deleteMany({}));
  if (Testimonial)  clears.push(Testimonial.deleteMany({}));

  await Promise.all(clears);
  console.log('🗑️   Cleared all collections');

  // ── Create Admin ───────────────────────────────────────────────────────────
  const admin = new Admin({
    email:    ADMIN_EMAIL,
    name:     ADMIN_NAME,
    password: ADMIN_PASSWORD   // hashed automatically by pre-save hook (bcrypt, salt 12)
  });
  await admin.save();

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n✅  Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin panel  →  /admin/login');
  console.log(`  Email        →  ${ADMIN_EMAIL}`);
  console.log(`  Password     →  ${ADMIN_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  ⚠️  Save these credentials — the password is');
  console.log('     stored as a bcrypt hash and cannot be');
  console.log('     recovered from the database.\n');
}

seed()
  .catch(err => { console.error('❌  Seed failed:', err.message); process.exit(1); })
  .finally(() => mongoose.disconnect());
