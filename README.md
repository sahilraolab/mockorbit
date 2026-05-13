# PrepFlow — Mock Test Platform

A clean, minimal, production-ready mock test platform for competitive exams (Judiciary, CLAT, SSC, etc.).

---

## ✨ Features

- **OTP-based login** (mock or Twilio SMS)
- **Paid test series** with Razorpay integration (mock mode for dev)
- **Full test interface** with timer and auto-submit
- **Result analysis** — score, rank, percentile, weak areas, detailed solutions
- **Admin panel** — manage exams, series, tests, questions, users, results
- **Clean minimal UI** inspired by Stripe / Urban Company

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### 2. Install dependencies

```bash
cd prepflow
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
APP_NAME=PrepFlow
APP_URL=http://localhost:3000
PORT=3000
MONGODB_URI=mongodb://localhost:27017/prepflow
SESSION_SECRET=your-secret-here

# OTP — set USE_MOCK_OTP=true to log OTP to console (dev)
USE_MOCK_OTP=true

# Payment — set USE_MOCK_PAYMENT=true to skip real payment (dev)
USE_MOCK_PAYMENT=true
ALLOW_FREE_ACCESS=true

# For production: set both to false and fill in real keys
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

ADMIN_EMAIL=admin@prepflow.in
ADMIN_PASSWORD=Admin@123
```

### 4. Seed demo data

```bash
npm run seed
```

This creates:
- 3 exams: Judiciary, CLAT, SSC CGL
- 3 test series with preview questions
- 4 tests with real MCQ questions
- 1 admin account

### 5. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Open: http://localhost:3000

---

## 🔑 Default Credentials

| Role  | Credential               |
|-------|--------------------------|
| Admin | admin@prepflow.in / Admin@123 |

---

## 📱 User Flow

1. **Browse** exams on homepage
2. **View** test series details and preview questions
3. **Login** with mobile number + OTP
4. **Pay** for the test series (mock payment in dev)
5. **Dashboard** → Start Test
6. **Attempt** MCQ test with timer
7. **Submit** → View result (score, rank, weak areas, solutions)

---

## 🛠 Admin Panel

URL: http://localhost:3000/admin/login

### Content Setup Order:
1. **Exams** → Create exam (e.g., Judiciary)
2. **Test Series** → Create series under exam (set price, mocks count)
3. **Tests** → Create tests under series (set duration)
4. **Questions** → Add MCQ questions to each test

---

## 🔁 Switching to Production

### Real SMS (Twilio):
```env
USE_MOCK_OTP=false
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+91xxxxxxxxxx
```

### Real Payments (Razorpay):
```env
USE_MOCK_PAYMENT=false
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
```

### Rebranding:
Just change `APP_NAME` in `.env` — it propagates everywhere automatically.

---

## 📁 Project Structure

```
prepflow/
├── app.js              # Express app setup
├── server.js           # Entry point
├── .env                # Environment variables
├── models/
│   ├── User.js
│   ├── Exam.js         # Exam, TestSeries, Test, Question
│   └── Attempt.js      # Attempt, Payment, Admin
├── controllers/
│   ├── authController.js
│   ├── homeController.js
│   ├── seriesController.js
│   ├── paymentController.js
│   ├── dashboardController.js
│   ├── testController.js
│   └── adminController.js
├── services/
│   ├── otpService.js   # Mock + Twilio abstraction
│   └── paymentService.js # Mock + Razorpay abstraction
├── routes/
│   ├── index.js
│   └── routes.js
├── middlewares/
│   └── auth.js
├── views/
│   ├── partials/
│   ├── admin/
│   ├── home.ejs
│   ├── login.ejs
│   ├── checkout.ejs
│   ├── dashboard.ejs
│   ├── test-interface.ejs
│   └── result.ejs
├── public/
│   ├── css/style.css
│   └── js/app.js
└── seeds/seed.js
```

---

## 🔐 Security Notes

- Admin passwords are bcrypt-hashed
- OTP expires in 10 minutes
- Session-based authentication
- All admin routes are protected
- Payment signature verified server-side
- Input validation on all forms
