/**
 * Payment Service — MockOrbit
 *
 * Toggle USE_MOCK_PAYMENT=true  → mock (dev/testing)
 * Toggle USE_MOCK_PAYMENT=false → live Razorpay
 *
 * Required .env keys for live mode:
 *   RAZORPAY_KEY_ID      — from Razorpay dashboard → API Keys
 *   RAZORPAY_KEY_SECRET  — from Razorpay dashboard → API Keys
 *   RAZORPAY_WEBHOOK_SECRET — from Razorpay dashboard → Webhooks (set when creating webhook)
 */

const crypto = require('crypto');

// ─── Mock ─────────────────────────────────────────────────────────────────
const mockPaymentService = {
  async createOrder(amount, currency, receipt) {
    const orderId = 'order_mock_' + Date.now();
    console.log('\n🔑  MOCK PAYMENT ORDER CREATED');
    console.log(`    Order ID : ${orderId}`);
    console.log(`    Amount   : ₹${amount / 100}\n`);
    return { id: orderId, amount, currency, receipt, status: 'created' };
  },
  verifySignature() { return true; },
  verifyWebhook() { return true; }
};

// ─── Razorpay ─────────────────────────────────────────────────────────────
const razorpayService = {
  _client: null,
  getClient() {
    if (!this._client) {
      const Razorpay = require('razorpay');
      this._client = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    }
    return this._client;
  },

  async createOrder(amount, currency = 'INR', receipt) {
    return this.getClient().orders.create({ amount, currency, receipt });
  },

  // Called after client-side checkout.js callback
  verifySignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  },

  // Called by server-side webhook handler
  verifyWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping webhook verification');
      return true;
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }
};

// ─── Selector ─────────────────────────────────────────────────────────────
const getService = () =>
  process.env.USE_MOCK_PAYMENT === 'true' ? mockPaymentService : razorpayService;

module.exports = {
  createOrder: (amount, currency, receipt) => getService().createOrder(amount, currency, receipt),
  verifySignature: (orderId, paymentId, signature) => getService().verifySignature(orderId, paymentId, signature),
  verifyWebhook: (rawBody, signature) => getService().verifyWebhook(rawBody, signature),
  getRazorpayKeyId: () => process.env.RAZORPAY_KEY_ID || 'mock_key',
  isMock: () => process.env.USE_MOCK_PAYMENT === 'true'
};
