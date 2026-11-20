const express = require('express');
const prisma = require('../lib/prisma');
const { interpretBrief } = require('../services/openai.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const opportunities = await prisma.opportunity.findMany({
    where: { tenantId: req.tenantId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(opportunities);
});

router.post('/', async (req, res) => {
  const { deadline, ...rest } = req.body;
  const opportunity = await prisma.opportunity.create({
    data: { ...rest, tenantId: req.tenantId, deadline: deadline ? new Date(deadline) : null },
  });
  res.status(201).json(opportunity);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.opportunity.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { deadline, ...rest } = req.body;
  const opportunity = await prisma.opportunity.update({
    where: { id: req.params.id },
    data: { ...rest, ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }) },
  });
  res.json(opportunity);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.opportunity.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.opportunity.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Turns a free-text brief ("we need futuristic electronic music for a tech commercial...")
// into structured criteria the matching engine can score against.
router.post('/:id/interpret', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  const opportunity = await prisma.opportunity.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!opportunity) return res.status(404).json({ error: 'Not found' });

  const criteria = await interpretBrief(tenant, req.body.briefText || opportunity.musicRequirement || '');
  if (!criteria) return res.status(400).json({ error: 'Add an OpenAI API key in Settings first' });
  res.json(criteria);
});

module.exports = router;
