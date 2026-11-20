const express = require('express');
const prisma = require('../lib/prisma');
const { draftPitchEmail } = require('../services/openai.service');
const { sendOutreach } = require('../services/email.service');
const { signPreviewToken } = require('../lib/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const messages = await prisma.outreachMessage.findMany({
    where: { tenantId: req.tenantId },
    include: { contact: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(messages);
});

// Generates a draft only - never sends. The human reviews/edits in the UI and then
// calls POST /:id/send, which is the one and only place this app transmits email.
router.post('/draft', async (req, res) => {
  const { contactId, trackIds, opportunityId } = req.body;

  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: req.tenantId },
    include: { company: true },
  });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  if (contact.doNotContact) return res.status(400).json({ error: 'Contact is marked do-not-contact' });

  const tracks = await prisma.track.findMany({
    where: { id: { in: trackIds || [] }, tenantId: req.tenantId, licensingStatus: 'APPROVED' },
  });
  if (tracks.length === 0) {
    return res.status(400).json({ error: 'No rights-approved tracks selected' });
  }

  const opportunity = opportunityId
    ? await prisma.opportunity.findFirst({ where: { id: opportunityId, tenantId: req.tenantId } })
    : null;

  const draft = await draftPitchEmail(tenant, { contact, company: contact.company, tracks, opportunity });
  if (!draft) return res.status(400).json({ error: 'Add an OpenAI API key in Settings first' });

  // Append private, time-limited listening links for each pitched track.
  const links = await Promise.all(
    tracks.map(async (t) => {
      const token = signPreviewToken(req.tenantId, t.id);
      return `${t.title}: ${process.env.PUBLIC_URL || ''}/api/public/preview/${token}`;
    })
  );
  const bodyWithLinks = `${draft.body}\n\nPrivate listening links:\n${links.join('\n')}`;

  const message = await prisma.outreachMessage.create({
    data: {
      tenantId: req.tenantId,
      contactId,
      trackIds: tracks.map((t) => t.id),
      subject: draft.subject,
      body: bodyWithLinks,
      status: 'DRAFT',
    },
  });
  res.status(201).json(message);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.outreachMessage.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status === 'SENT') return res.status(400).json({ error: 'Cannot edit a sent message' });
  const { subject, body } = req.body;
  const updated = await prisma.outreachMessage.update({
    where: { id: req.params.id },
    data: { ...(subject !== undefined && { subject }), ...(body !== undefined && { body }) },
  });
  res.json(updated);
});

// The explicit human action that actually transmits the email.
router.post('/:id/send', async (req, res) => {
  const message = await prisma.outreachMessage.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { contact: true },
  });
  if (!message) return res.status(404).json({ error: 'Not found' });
  if (message.status === 'SENT') return res.status(400).json({ error: 'Already sent' });
  if (!message.contact.email) return res.status(400).json({ error: 'Contact has no email address' });
  if (message.contact.doNotContact) return res.status(400).json({ error: 'Contact is marked do-not-contact' });

  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  try {
    await sendOutreach(tenant, {
      to: message.contact.email,
      subject: message.subject,
      html: message.body.replace(/\n/g, '<br/>'),
    });
  } catch (err) {
    await prisma.outreachMessage.update({ where: { id: message.id }, data: { status: 'FAILED' } });
    return res.status(500).json({ error: err.message });
  }

  const updated = await prisma.outreachMessage.update({
    where: { id: message.id },
    data: { status: 'SENT', sentAt: new Date() },
  });
  await prisma.contact.update({ where: { id: message.contactId }, data: { outreachStatus: 'CONTACTED' } });
  res.json(updated);
});

router.post('/:id/record-response', async (req, res) => {
  const existing = await prisma.outreachMessage.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { response, optOut, followUpDate } = req.body;
  const updated = await prisma.outreachMessage.update({
    where: { id: req.params.id },
    data: {
      ...(response !== undefined && { response }),
      ...(optOut !== undefined && { optOut }),
      ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
    },
  });
  if (optOut) {
    await prisma.contact.update({ where: { id: existing.contactId }, data: { doNotContact: true } });
  } else if (response) {
    await prisma.contact.update({ where: { id: existing.contactId }, data: { outreachStatus: 'REPLIED' } });
  }
  res.json(updated);
});

module.exports = router;
