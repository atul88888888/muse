const express = require('express');
const prisma = require('../lib/prisma');
const { encrypt } = require('../lib/crypto');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Settings page: lets a tenant plug in their OWN OpenAI key and SMTP credentials.
// The platform never ships shared keys - each tenant pays for and controls their own.
router.get('/me', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  res.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    hasOpenaiKey: Boolean(tenant.openaiApiKeyEnc),
    smtpHost: tenant.smtpHost,
    smtpPort: tenant.smtpPort,
    smtpUser: tenant.smtpUser,
    hasSmtpPass: Boolean(tenant.smtpPassEnc),
    fromEmail: tenant.fromEmail,
    fromName: tenant.fromName,
  });
});

router.put('/me/integrations', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  const { openaiApiKey, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;

  const data = {};
  if (openaiApiKey !== undefined) data.openaiApiKeyEnc = encrypt(openaiApiKey);
  if (smtpHost !== undefined) data.smtpHost = smtpHost;
  if (smtpPort !== undefined) data.smtpPort = smtpPort ? Number(smtpPort) : null;
  if (smtpUser !== undefined) data.smtpUser = smtpUser;
  if (smtpPass !== undefined) data.smtpPassEnc = encrypt(smtpPass);
  if (fromEmail !== undefined) data.fromEmail = fromEmail;
  if (fromName !== undefined) data.fromName = fromName;

  await prisma.tenant.update({ where: { id: req.tenantId }, data });
  res.json({ ok: true });
});

module.exports = router;
