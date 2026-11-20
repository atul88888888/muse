const nodemailer = require('nodemailer');
const { decrypt } = require('../lib/crypto');

function transportFor(tenant) {
  if (!tenant.smtpHost || !tenant.smtpUser || !tenant.smtpPassEnc) {
    throw new Error('Tenant has not configured SMTP outreach credentials yet');
  }
  return nodemailer.createTransport({
    host: tenant.smtpHost,
    port: tenant.smtpPort || 587,
    secure: (tenant.smtpPort || 587) === 465,
    auth: {
      user: tenant.smtpUser,
      pass: decrypt(tenant.smtpPassEnc),
    },
  });
}

// Only ever called from the "approve and send" route, after a human has reviewed the
// draft in the UI. Nothing in this codebase sends email automatically.
async function sendOutreach(tenant, { to, subject, html }) {
  const transport = transportFor(tenant);
  return transport.sendMail({
    from: tenant.fromName ? `"${tenant.fromName}" <${tenant.fromEmail || tenant.smtpUser}>` : tenant.smtpUser,
    to,
    subject,
    html,
  });
}

module.exports = { sendOutreach };
