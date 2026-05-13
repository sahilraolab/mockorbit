const { TestSeries } = require('../models/Exam');
const { Payment } = require('../models/Attempt');
const User = require('../models/User');
const paymentService = require('../services/paymentService');

const isFreeAccessEnabled = () =>
  process.env.ALLOW_FREE_ACCESS === 'true' || paymentService.isMock();

// ─── Checkout page ─────────────────────────────────────────────────────────
exports.showCheckout = async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.seriesId).populate('examId').lean();
    if (!series) {
      req.flash('error', 'Test series not found');
      return res.redirect('/');
    }

    if (req.user.hasPurchased(series._id)) {
      req.flash('success', 'You already own this test series');
      return res.redirect('/dashboard');
    }

    res.render('checkout', {
      title: `Checkout — ${series.title} · MockOrbit`,
      series,
      user: req.user,
      razorpayKeyId: paymentService.getRazorpayKeyId(),
      useMockPayment: paymentService.isMock(),
      allowFreeAccess: isFreeAccessEnabled(),
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Checkout error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
};

// ─── Create Razorpay order ─────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    if (req.user.hasPurchased(series._id)) {
      return res.json({ success: false, message: 'Already purchased' });
    }

    // Free / mock access bypass
    if (isFreeAccessEnabled()) {
      await grantAccess(req.user._id, series._id, series.price, 'free_' + Date.now(), 'free_' + Date.now());
      return res.json({ success: true, redirect: '/dashboard', freeAccess: true });
    }

    const amount = Math.round(series.price * 100); // to paise
    const receipt = `rcpt_${req.user._id}_${Date.now()}`.slice(0, 40);
    const order = await paymentService.createOrder(amount, 'INR', receipt);

    // Save pending payment
    await Payment.create({
      userId: req.user._id,
      testSeriesId: series._id,
      amount: series.price,
      razorpayOrderId: order.id,
      status: 'pending'
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      seriesName: series.title
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Payment initiation failed. Please try again.' });
  }
};

// ─── Verify payment (client-side callback) ─────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, seriesId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const isValid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );
      return res.status(400).json({ success: false, message: 'Payment verification failed. Contact support with your payment ID.' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, status: 'success' },
      { new: true }
    );

    if (!payment) {
      return res.status(400).json({ success: false, message: 'Payment record not found' });
    }

    await grantAccess(payment.userId, payment.testSeriesId);
    res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed. Please contact support.' });
  }
};

// ─── Razorpay Webhook (server-side, most reliable) ─────────────────────────
// Set up in Razorpay Dashboard → Webhooks → Add URL: https://yourdomain.com/payment/webhook
// Events to subscribe: payment.captured, payment.failed
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).send('Missing signature');

    // req.rawBody is set by the raw body middleware on this route in app.js
    const isValid = paymentService.verifyWebhook(req.rawBody, signature);
    if (!isValid) {
      console.warn('Razorpay webhook: invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      const record = await Payment.findOne({ razorpayOrderId: orderId });
      if (!record) {
        // payment might not exist yet if webhook arrived before client callback
        console.warn('Webhook: payment record not found for order', orderId);
        return res.json({ status: 'ok' });
      }

      if (record.status !== 'success') {
        record.razorpayPaymentId = paymentId;
        record.status = 'success';
        await record.save();
        await grantAccess(record.userId, record.testSeriesId);
        console.log(`Webhook: payment captured — order ${orderId}, user ${record.userId}`);
      }
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload.payment.entity;
      await Payment.findOneAndUpdate(
        { razorpayOrderId: payment.order_id },
        { status: 'failed' }
      );
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
};

// ─── Free access (ALLOW_FREE_ACCESS=true only) ─────────────────────────────
exports.freeAccess = async (req, res) => {
  try {
    if (!isFreeAccessEnabled()) {
      return res.status(403).json({ success: false, message: 'Free access is disabled' });
    }

    const series = await TestSeries.findById(req.params.seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    if (req.user.hasPurchased(series._id)) {
      return res.json({ success: true, redirect: '/dashboard' });
    }

    await grantAccess(req.user._id, series._id, series.price, 'free_' + Date.now(), 'free_' + Date.now());
    res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    console.error('Free access error:', err);
    res.status(500).json({ success: false, message: 'Could not grant free access' });
  }
};

// ─── Mock payment success (USE_MOCK_PAYMENT=true only) ─────────────────────
exports.mockPaymentSuccess = async (req, res) => {
  try {
    if (!paymentService.isMock()) {
      return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    if (req.user.hasPurchased(series._id)) {
      return res.json({ success: true, redirect: '/dashboard' });
    }

    await grantAccess(req.user._id, series._id, series.price, 'mock_order_' + Date.now(), 'mock_pay_' + Date.now());
    res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    console.error('Mock payment error:', err);
    res.status(500).json({ success: false, message: 'Mock payment failed' });
  }
};

// ─── Helper: grant test access + create payment record ─────────────────────
async function grantAccess(userId, testSeriesId, amount = 0, orderId = null, paymentId = null) {
  // Idempotent: only add if not already purchased
  await User.findByIdAndUpdate(userId, {
    $addToSet: { purchasedTests: { testSeriesId } }
  });

  if (orderId) {
    // Upsert payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { userId, testSeriesId, amount, razorpayOrderId: orderId, razorpayPaymentId: paymentId, status: 'success' },
      { upsert: true }
    );
  }
}
