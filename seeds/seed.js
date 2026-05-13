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
    email: process.env.ADMIN_EMAIL || 'admin@prepflow.in',
    name: 'Super Admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  });
  await admin.save();
  console.log(`👤 Admin created: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);

  // ─── Exams ───────────────────────────────────────────────
  const exams = await Exam.insertMany([
    { name: 'Judiciary', slug: 'judiciary', description: 'State PCS (J) & HJS examinations', icon: '⚖️' },
    { name: 'CLAT', slug: 'clat', description: 'Common Law Admission Test', icon: '📜' },
    { name: 'SSC CGL', slug: 'ssc-cgl', description: 'Staff Selection Commission CGL', icon: '🏛️' },
  ]);
  console.log('🎓 Exams seeded');

  // ─── Test Series ─────────────────────────────────────────
  const judiciarySeriesData = [
    {
      examId: exams[0]._id,
      title: 'Judiciary 2025 Complete Pack',
      price: 1499,
      totalMocks: 30,
      description: 'Full-length mocks for PCS (J) covering GK, Law, and Essay.',
      features: ['30 full-length mocks', 'Latest pattern 2025', 'Detailed solutions', 'All-India rank', 'Weak area analysis'],
      previewQuestions: [
        {
          question: 'Which Article of the Indian Constitution deals with the Right to Equality?',
          options: ['Article 12', 'Article 14', 'Article 19', 'Article 21'],
          correctAnswer: 1,
          explanation: 'Article 14 guarantees equality before the law and equal protection of the laws to all persons within the territory of India.'
        },
        {
          question: 'The doctrine of "Basic Structure" of the Constitution was propounded in which case?',
          options: ['A.K. Gopalan case', 'Golaknath case', 'Kesavananda Bharati case', 'Minerva Mills case'],
          correctAnswer: 2,
          explanation: 'The Supreme Court in Kesavananda Bharati v. State of Kerala (1973) held that Parliament cannot alter the basic structure of the Constitution.'
        },
        {
          question: 'Which schedule of the Indian Constitution contains the Oath of Office for the President?',
          options: ['Second Schedule', 'Third Schedule', 'Fourth Schedule', 'Fifth Schedule'],
          correctAnswer: 1,
          explanation: 'The Third Schedule contains forms of oaths or affirmations including for the President, Vice-President, Ministers, and Judges.'
        }
      ]
    }
  ];

  const clatSeriesData = [
    {
      examId: exams[1]._id,
      title: 'CLAT 2026 Elite Series',
      price: 999,
      totalMocks: 20,
      description: 'Comprehensive CLAT preparation with legal reasoning and comprehension mocks.',
      features: ['20 full-length mocks', 'Legal reasoning focus', 'Detailed solutions', 'Rank among CLAT aspirants'],
      previewQuestions: [
        {
          question: 'In legal reasoning, the term "ratio decidendi" refers to:',
          options: ['Things said by the way', 'The reason for the decision', 'A binding precedent', 'An obiter dictum'],
          correctAnswer: 1,
          explanation: '"Ratio decidendi" is a Latin term meaning "the reason for the decision." It is the binding part of a judicial decision.'
        }
      ]
    }
  ];

  const sscSeriesData = [
    {
      examId: exams[2]._id,
      title: 'SSC CGL Tier I & II Combo',
      price: 799,
      totalMocks: 25,
      description: 'Complete SSC CGL preparation — Quant, English, GK, and Reasoning.',
      features: ['25 full-length mocks', 'Tier I + Tier II coverage', 'Topic-wise analysis', 'Score booster tests'],
      previewQuestions: [
        {
          question: 'If the sum of two numbers is 40 and their product is 375, what is the sum of their reciprocals?',
          options: ['8/75', '3/40', '8/15', '2/25'],
          correctAnswer: 0,
          explanation: 'Sum of reciprocals = (a+b)/(a×b) = 40/375 = 8/75.'
        }
      ]
    }
  ];

  const allSeriesData = [...judiciarySeriesData, ...clatSeriesData, ...sscSeriesData];
  const seriesArr = await TestSeries.insertMany(allSeriesData);
  console.log('📚 Test series seeded');

  // ─── Tests ───────────────────────────────────────────────
  const tests = await Test.insertMany([
    { testSeriesId: seriesArr[0]._id, title: 'Mock Test 1 — Constitutional Law', duration: 120, totalQuestions: 0 },
    { testSeriesId: seriesArr[0]._id, title: 'Mock Test 2 — Civil Procedure', duration: 120, totalQuestions: 0 },
    { testSeriesId: seriesArr[1]._id, title: 'CLAT Mock 1', duration: 120, totalQuestions: 0 },
    { testSeriesId: seriesArr[2]._id, title: 'SSC CGL Tier I — Mock 1', duration: 60, totalQuestions: 0 },
  ]);
  console.log('📝 Tests seeded');

  // ─── Questions ───────────────────────────────────────────
  const judiciaryQ = [
    {
      testId: tests[0]._id,
      question: 'Which Article of the Indian Constitution provides for the formation of new States and alteration of areas, boundaries or names of existing States?',
      options: ['Article 1', 'Article 2', 'Article 3', 'Article 4'],
      correctAnswer: 2,
      explanation: 'Article 3 empowers Parliament by law to form new States and alter areas, boundaries, or names of existing States.',
      tag: 'Constitutional Law',
      order: 1
    },
    {
      testId: tests[0]._id,
      question: 'The Preamble to the Indian Constitution was amended by the:',
      options: ['42nd Constitutional Amendment', '44th Constitutional Amendment', '52nd Constitutional Amendment', '61st Constitutional Amendment'],
      correctAnswer: 0,
      explanation: 'The 42nd Constitutional Amendment Act, 1976 added the words "Socialist", "Secular", and "Integrity" to the Preamble.',
      tag: 'Constitutional Law',
      order: 2
    },
    {
      testId: tests[0]._id,
      question: 'Which of the following is NOT a Directive Principle of State Policy under Part IV of the Constitution?',
      options: ['Right to work', 'Equal pay for equal work', 'Free legal aid', 'Right to education (Art. 21A)'],
      correctAnswer: 3,
      explanation: 'Right to Education under Article 21A is a Fundamental Right, not a Directive Principle. It was added by the 86th Amendment.',
      tag: 'Directive Principles',
      order: 3
    },
    {
      testId: tests[0]._id,
      question: 'The concept of Judicial Review in India has been borrowed from:',
      options: ['United Kingdom', 'United States of America', 'Australia', 'Canada'],
      correctAnswer: 1,
      explanation: 'The concept of Judicial Review in India was borrowed from the USA, where it was established in Marbury v. Madison (1803).',
      tag: 'Constitutional Law',
      order: 4
    },
    {
      testId: tests[0]._id,
      question: 'Under which Article can the President of India proclaim a National Emergency?',
      options: ['Article 352', 'Article 356', 'Article 360', 'Article 365'],
      correctAnswer: 0,
      explanation: 'Article 352 empowers the President to proclaim a National Emergency when the security of India or a part thereof is threatened.',
      tag: 'Emergency Provisions',
      order: 5
    },
    {
      testId: tests[0]._id,
      question: 'The writ of "Mandamus" is issued by a court:',
      options: [
        'To produce a detained person before court',
        'To direct a public authority to perform its public duty',
        'To question the authority of a person holding public office',
        'To transfer a case from one court to another'
      ],
      correctAnswer: 1,
      explanation: 'Mandamus is a writ issued by a superior court commanding a public official, government body, or lower court to perform a duty required by law.',
      tag: 'Writs',
      order: 6
    },
    {
      testId: tests[0]._id,
      question: 'Which schedule of the Constitution deals with the allocation of seats in the Rajya Sabha?',
      options: ['First Schedule', 'Third Schedule', 'Fourth Schedule', 'Sixth Schedule'],
      correctAnswer: 2,
      explanation: 'The Fourth Schedule contains provisions relating to the allocation of seats in the Council of States (Rajya Sabha).',
      tag: 'Constitutional Law',
      order: 7
    },
    {
      testId: tests[0]._id,
      question: '"Habeas Corpus" literally means:',
      options: ['"You may have the body"', '"Let justice be done"', '"For what cause"', '"We command"'],
      correctAnswer: 0,
      explanation: 'Habeas Corpus is a Latin term meaning "you may have the body." It is a writ requiring a person under arrest to be brought before a judge.',
      tag: 'Writs',
      order: 8
    },
    {
      testId: tests[0]._id,
      question: 'The Comptroller and Auditor General (CAG) of India is appointed by whom?',
      options: ['Prime Minister', 'Parliament', 'President', 'Chief Justice of India'],
      correctAnswer: 2,
      explanation: 'Under Article 148, the CAG of India is appointed by the President of India by warrant under his hand and seal.',
      tag: 'Constitutional Bodies',
      order: 9
    },
    {
      testId: tests[0]._id,
      question: 'Which Article of the Constitution abolishes untouchability?',
      options: ['Article 14', 'Article 15', 'Article 17', 'Article 19'],
      correctAnswer: 2,
      explanation: 'Article 17 abolishes "untouchability" and forbids its practice in any form. The enforcement of any disability arising out of untouchability is an offence.',
      tag: 'Fundamental Rights',
      order: 10
    }
  ];

  const clatQ = [
    {
      testId: tests[2]._id,
      question: 'Principle: A person who keeps wild animals is strictly liable for any damage caused by them if they escape.\nFacts: Ram kept a lion in his private zoo. The lion escaped and injured Shyam. Ram claims he had taken all reasonable precautions.',
      options: [
        'Ram is not liable as he took all precautions',
        'Ram is liable regardless of precautions taken',
        'Ram is liable only if negligence is proved',
        'Ram is not liable as it was an Act of God'
      ],
      correctAnswer: 1,
      explanation: 'This is a case of strict liability under the rule in Rylands v. Fletcher. The escape of a wild (dangerous) animal imposes strict liability on the keeper regardless of precautions.',
      tag: 'Legal Reasoning',
      order: 1
    },
    {
      testId: tests[2]._id,
      question: 'The Latin term "Res Judicata" means:',
      options: ['The thing speaks for itself', 'A matter already judged', 'Let the principal be responsible', 'In the same matter'],
      correctAnswer: 1,
      explanation: '"Res Judicata" is a Latin phrase meaning "a matter already judged." It prevents parties from relitigating issues that have already been finally decided by a court.',
      tag: 'Legal Terminology',
      order: 2
    },
    {
      testId: tests[2]._id,
      question: 'In the passage: "Democracy is a government of the people, by the people, for the people." The phrase was famously used by:',
      options: ['Mahatma Gandhi', 'Abraham Lincoln', 'Winston Churchill', 'Nelson Mandela'],
      correctAnswer: 1,
      explanation: 'This phrase was used by Abraham Lincoln in his Gettysburg Address delivered on November 19, 1863, during the American Civil War.',
      tag: 'English & Comprehension',
      order: 3
    },
    {
      testId: tests[2]._id,
      question: 'Choose the correct meaning of the idiom: "To burn the midnight oil"',
      options: ['To work late into the night', 'To waste money on fuel', 'To be careless about fire safety', 'To celebrate at night'],
      correctAnswer: 0,
      explanation: '"To burn the midnight oil" means to work or study late into the night, originally referring to the use of oil lamps for late-night study.',
      tag: 'English & Comprehension',
      order: 4
    },
    {
      testId: tests[2]._id,
      question: 'The current Chairman of the National Human Rights Commission (NHRC) of India is appointed by:',
      options: ['Chief Justice of India', 'President of India', 'Prime Minister of India', 'Home Minister of India'],
      correctAnswer: 1,
      explanation: 'The Chairperson of the NHRC is appointed by the President of India on the recommendation of a Committee headed by the Prime Minister.',
      tag: 'Current Affairs & GK',
      order: 5
    }
  ];

  const sscQ = [
    {
      testId: tests[3]._id,
      question: 'A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less for the same journey. Find the speed of the train.',
      options: ['40 km/h', '45 km/h', '36 km/h', '30 km/h'],
      correctAnswer: 0,
      explanation: 'Let speed = x. Then 360/x − 360/(x+5) = 1. Solving: 360(x+5) − 360x = x(x+5). 1800 = x²+5x. x²+5x−1800=0. (x+45)(x−40)=0. So x=40 km/h.',
      tag: 'Quantitative Aptitude',
      order: 1
    },
    {
      testId: tests[3]._id,
      question: 'Select the most appropriate synonym of the word "Ephemeral".',
      options: ['Permanent', 'Transient', 'Eternal', 'Robust'],
      correctAnswer: 1,
      explanation: '"Ephemeral" means lasting for a very short time. Its synonym is "Transient" meaning temporary or short-lived.',
      tag: 'English Language',
      order: 2
    },
    {
      testId: tests[3]._id,
      question: 'Who among the following was the first Governor-General of Independent India?',
      options: ['Lord Mountbatten', 'C. Rajagopalachari', 'Dr. Rajendra Prasad', 'Sardar Vallabhbhai Patel'],
      correctAnswer: 0,
      explanation: 'Lord Louis Mountbatten became the first Governor-General of independent India on August 15, 1947, and served until June 1948.',
      tag: 'General Knowledge',
      order: 3
    },
    {
      testId: tests[3]._id,
      question: 'In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written in the same code?',
      options: ['EOJDJEFM', 'MFEJDJOF', 'EDJDEJOF', 'MFEJEFOF'],
      correctAnswer: 0,
      explanation: 'Each letter is shifted: the word is reversed and each letter is shifted by 1 position forward in the alphabet. M→E, E→O, D→J, I→D, C→J, I→E, N→F, E→M → EOJDJEFM.',
      tag: 'Reasoning',
      order: 4
    },
    {
      testId: tests[3]._id,
      question: 'The speed of light in vacuum is approximately:',
      options: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10¹² m/s'],
      correctAnswer: 1,
      explanation: 'The speed of light in vacuum is approximately 3 × 10⁸ m/s (299,792,458 m/s exactly, often rounded to 3 × 10⁸ m/s).',
      tag: 'General Knowledge',
      order: 5
    }
  ];

  const allQuestions = [...judiciaryQ, ...clatQ, ...sscQ];
  await Question.insertMany(allQuestions);

  // Update question counts on tests
  await Test.findByIdAndUpdate(tests[0]._id, { totalQuestions: judiciaryQ.length });
  await Test.findByIdAndUpdate(tests[2]._id, { totalQuestions: clatQ.length });
  await Test.findByIdAndUpdate(tests[3]._id, { totalQuestions: sscQ.length });

  console.log(`❓ Questions seeded (${allQuestions.length} total)`);

  await mongoose.disconnect();

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log(`Admin login: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log(`Admin URL:   http://localhost:${process.env.PORT || 3000}/admin/login`);
  console.log('─────────────────────────────────────────\n');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
