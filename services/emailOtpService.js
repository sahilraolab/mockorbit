/**
 * Email OTP Service — MockOrbit
 * Provider: Resend (https://resend.com)
 *
 * .env:
 *   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
 *   EMAIL_FROM=MockOrbit <otp@mockorbit.in>
 *
 * If RESEND_API_KEY is not set, OTP is logged to console (dev mode).
 */

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports.generateOTP = generateOTP;

module.exports.sendEmailOTP = async (email, otp) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('\n══════════════════════════════════════');
    console.log('📧  MOCK EMAIL OTP (no RESEND_API_KEY set)');
    console.log(`    To  : ${email}`);
    console.log(`    OTP : ${otp}`);
    console.log('══════════════════════════════════════\n');
    return { success: true };
  }

  const from    = process.env.EMAIL_FROM || 'MockOrbit <otp@mockorbit.in>';
  const appName = process.env.APP_NAME   || 'MockOrbit';
  const appUrl  = process.env.APP_URL    || 'https://mockorbit.in';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ${appName} OTP</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1c2b3a;padding:28px 36px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#ffffff;">Mock</span><span style="font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#f97316;">Orbit</span>
        </td></tr>
        <tr><td style="padding:36px 36px 24px;">
          <h2 style="margin:0 0 8px;font-size:1.2rem;color:#1c2b3a;">Your Login OTP</h2>
          <p style="margin:0 0 28px;font-size:0.95rem;color:#6b7280;line-height:1.6;">Use the code below to log in. It expires in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:0 0 28px;">
            <div style="display:inline-block;background:#f4f6f9;border:2px dashed #d1d5db;border-radius:12px;padding:20px 48px;">
              <span style="font-size:2.4rem;font-weight:800;letter-spacing:0.25em;color:#1c2b3a;font-family:'Courier New',monospace;">${otp}</span>
            </div>
          </div>
          <p style="margin:0;font-size:0.85rem;color:#9ca3af;line-height:1.6;">If you did not request this OTP, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e5e7eb;"></td></tr>
        <tr><td style="padding:20px 36px 28px;text-align:center;">
          <p style="margin:0;font-size:0.78rem;color:#9ca3af;">${appName} — India's focused mock test platform<br><a href="${appUrl}" style="color:#f97316;text-decoration:none;">${appUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${otp} is your ${appName} login OTP`,
      html,
      text: `Your ${appName} OTP is: ${otp}\n\nValid for 10 minutes. Do not share this code.\n\n${appName} — ${appUrl}`
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Resend error: ' + (data.message || JSON.stringify(data)));
  return { success: true, messageId: data.id };
};
