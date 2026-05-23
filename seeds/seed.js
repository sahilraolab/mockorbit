require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { Exam, TestSeries, Test, Question } = require('../models/Exam');
const { Admin, Attempt, Payment } = require('../models/Attempt');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepflow';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    Exam.deleteMany({}),
    TestSeries.deleteMany({}),
    Test.deleteMany({}),
    Question.deleteMany({}),
    Admin.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ─── Admin ───────────────────────────────────────────────
  const admin = new Admin({
    email: process.env.ADMIN_EMAIL || 'admin@mockorbit.com',
    name: 'Super Admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  });
  await admin.save();
  console.log(`👤 Admin created: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);

  // ─── AIBE XXI Exam ───────────────────────────────────────
  const [exam] = await Exam.insertMany([
    {
      name: 'AIBE XXI',
      slug: 'aibe-xxi',
      description: 'All India Bar Examination XXI — the mandatory qualifying exam for advocates to practice law in India, conducted by Bar Council of India Trust.',
      icon: '⚖️',
      category: 'Law Entrance',
      conductedBy: 'Bar Council of India Trust',
      examLevel: 'National',
      eligibility: 'LLB / BA LLB (5-year) graduates enrolled with a State Bar Council',
      frequency: 'Annual',
      language: ['English', 'Hindi'],
      examDuration: '3.5 Hours',
      totalMarks: 380,
      metaDesc: 'AIBE XXI mock test 2026 — 380 questions across 19 law topics. Open book, no negative marking. Practice with MockOrbit.',
      isActive: true,
      sortOrder: 1,
    }
  ]);
  console.log('🎓 AIBE XXI exam seeded');

  // ─── Test Series ─────────────────────────────────────────
  const [series] = await TestSeries.insertMany([
    {
      examId: exam._id,
      title: 'AIBE XXI Mock Test Series 2026',
      price: 0,
      totalMocks: 1,
      description: 'Full-length AIBE XXI mock test covering all 19 topics — Constitutional Law, IPC/BNS, CrPC/BNSS, CPC, Evidence Act, ADR, Family Law, PIL, Administrative Law, Professional Ethics, Company Law, Environmental Law, Cyber Law, Labour Law, Law of Torts, Taxation, Contract Law, Land Acquisition, and IPR.',
      features: [
        '380 questions across 19 law topics',
        '20 questions per topic',
        'Open book format (as per actual AIBE)',
        'No negative marking',
        'Topic-wise performance analysis',
        'Detailed explanations for each answer',
        'All-India rank among AIBE aspirants',
      ],
      previewQuestions: [
        {
          question: 'Which Article of the Indian Constitution abolishes untouchability?',
          options: ['Article 14', 'Article 15', 'Article 17', 'Article 21'],
          correctAnswer: 2,
          explanation: 'Article 17 of the Constitution abolishes untouchability and makes its practice in any form an offence.'
        },
        {
          question: 'The concept of "Basic Structure" of the Constitution was propounded in:',
          options: [
            'A.K. Gopalan v. State of Madras',
            'Kesavananda Bharati v. State of Kerala',
            'Maneka Gandhi v. Union of India',
            'Minerva Mills v. Union of India'
          ],
          correctAnswer: 1,
          explanation: 'The Supreme Court in Kesavananda Bharati v. State of Kerala (1973) held that Parliament cannot alter the basic structure of the Constitution.'
        },
        {
          question: 'Right to Privacy was declared a Fundamental Right in:',
          options: [
            'People\'s Union for Civil Liberties v. UOI',
            'Justice K.S. Puttaswamy v. Union of India',
            'Maneka Gandhi v. Union of India',
            'Kharak Singh v. State of U.P.'
          ],
          correctAnswer: 1,
          explanation: 'In Justice K.S. Puttaswamy (Retd.) v. Union of India (2017), a 9-judge bench unanimously held that the right to privacy is a fundamental right protected under Part III of the Constitution.'
        }
      ],
      isActive: true,
    }
  ]);
  console.log('📦 Test series seeded');

  // ─── Test ─────────────────────────────────────────────────
  const [test] = await Test.insertMany([
    {
      testSeriesId: series._id,
      title: 'AIBE XXI Full Mock Test 2026',
      duration: 210,        // 3.5 hours in minutes
      totalQuestions: 0,    // will increase as questions are imported via Excel
      isActive: true,
    }
  ]);
  console.log('📝 Test created (0 questions — import via Excel from admin panel)');

  // ─── Sample Questions (3) — Upload the full 380 via Excel ──
  const sampleQuestions = [
    {
      testId: test._id,
      question: 'Which Article of the Indian Constitution abolishes untouchability?',
      options: ['Article 14', 'Article 15', 'Article 17', 'Article 21'],
      correctAnswer: 2,
      explanation: 'Article 17 abolishes untouchability and makes its practice in any form a punishable offence.',
      tag: 'Constitutional Law',
      order: 1,
    },
    {
      testId: test._id,
      question: 'The Indian Penal Code came into force on:',
      options: ['1st January 1860', '1st January 1862', '26th January 1950', '15th August 1947'],
      correctAnswer: 1,
      explanation: 'The IPC was enacted in 1860 but came into force on 1st January 1862.',
      tag: 'IPC / Bharatiya Nyaya Sanhita (BNS)',
      order: 1,
    },
    {
      testId: test._id,
      question: 'Under which section of CrPC / BNSS is an FIR registered?',
      options: ['Section 154', 'Section 173', 'Section 437', 'Section 482'],
      correctAnswer: 0,
      explanation: 'Section 154 CrPC (Section 173 BNSS) deals with registration of First Information Report (FIR) by the police.',
      tag: 'CrPC / Bharatiya Nagarik Suraksha Sanhita (BNSS)',
      order: 1,
    },
  ];

  await Question.insertMany(sampleQuestions);
  await Test.findByIdAndUpdate(test._id, { totalQuestions: sampleQuestions.length });
  console.log(`❓ ${sampleQuestions.length} sample questions seeded`);

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin        : ${admin.email}`);
  console.log(`Exam         : AIBE XXI (slug: aibe-xxi)`);
  console.log(`Test Series  : ${series.title}`);
  console.log(`Test ID      : ${test._id}`);
  console.log(`Questions    : ${sampleQuestions.length} sample (import full 380 via Admin → Questions → Bulk Import Excel)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch(err => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => mongoose.disconnect());
