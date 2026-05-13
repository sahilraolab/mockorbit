/**
 * OTP Service — MockOrbit
 *
 * Providers:
 *   mock       → logs OTP to console (development)
 *   fast2sms   → Fast2SMS OTP route  (cheapest: ~₹0.25/SMS, no min recharge)
 *   msg91      → MSG91 OTP API       (₹0.20/SMS, more reliable at scale)
 *   twilio     → Twilio SMS          (international, costliest)
 *
 * Set SMS_PROVIDER=fast2sms in .env for production.
 * Set USE_MOCK_OTP=true to always use mock regardless of provider.
 */

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── Mock ─────────────────────────────────────────────────────────────────
const mockProvider = {
  async send(mobile, otp) {
    console.log('\n══════════════════════════════════════');
    console.log('📱  MOCK OTP SERVICE (development)');
    console.log(`    Mobile : +91${mobile}`);
    console.log(`    OTP    : ${otp}`);
    console.log('══════════════════════════════════════\n');
    return { success: true, messageId: 'mock-' + Date.now() };
  }
};

// ─── Fast2SMS ─────────────────────────────────────────────────────────────
// Docs: https://docs.fast2sms.com
// Route "otp" uses Fast2SMS default OTP template — no DLT needed for testing.
// For branded sender/template, register on DLT and use route "dlt" instead.
const fast2smsProvider = {
  async send(mobile, otp) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) throw new Error('FAST2SMS_API_KEY is not set in .env');

    const params = new URLSearchParams({
      variables_values: otp,
      route: 'otp',
      numbers: mobile
    });

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!data.return) {
      const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Fast2SMS error');
      throw new Error('Fast2SMS: ' + msg);
    }

    return { success: true, messageId: data.request_id };
  }
};

// ─── MSG91 ────────────────────────────────────────────────────────────────
// Docs: https://msg91.com/apidoc
// Requires: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID
// Template example (create in MSG91 dashboard): "Your {{otp}} is the OTP for MockOrbit login. Valid 10 mins. - MockOrbit"
const msg91Provider = {
  async send(mobile, otp) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) throw new Error('MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is not set in .env');

    const payload = {
      template_id: templateId,
      mobile: '91' + mobile,
      authkey: authKey,
      otp
    };

    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.type !== 'success') {
      throw new Error('MSG91: ' + (data.message || 'Unknown error'));
    }

    return { success: true, messageId: data.request_id || 'msg91-' + Date.now() };
  }
};

// ─── Twilio (legacy fallback) ─────────────────────────────────────────────
const twilioProvider = {
  async send(mobile, otp) {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: `Your ${process.env.APP_NAME} OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobile}`
    });
    return { success: true, messageId: message.sid };
  }
};

// ─── Provider selector ────────────────────────────────────────────────────
const getProvider = () => {
  if (process.env.USE_MOCK_OTP === 'true') return mockProvider;
  const provider = (process.env.SMS_PROVIDER || 'fast2sms').toLowerCase();
  switch (provider) {
    case 'fast2sms': return fast2smsProvider;
    case 'msg91':    return msg91Provider;
    case 'twilio':   return twilioProvider;
    case 'mock':     return mockProvider;
    default:
      console.warn(`Unknown SMS_PROVIDER "${provider}", falling back to mock.`);
      return mockProvider;
  }
};

module.exports = {
  generateOTP,
  sendOTP: async (mobile, otp) => {
    const provider = getProvider();
    return provider.send(mobile, otp);
  }
};
