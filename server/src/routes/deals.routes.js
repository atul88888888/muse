const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  const deals = await prisma.deal.findMany({
    where: { tenantId: req.tenantId },
    include: { track: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(deals);
});

router.post('/', async (req, res) => {
  const track = await prisma.track.findFirst({ where: { id: req.body.trackId, tenantId: req.tenantId } });
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const deal = await prisma.deal.create({ data: { ...req.body, tenantId: req.tenantId } });
  res.status(201).json(deal);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const deal = await prisma.deal.update({ where: { id: req.params.id }, data: req.body });
  res.json(deal);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.deal.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.get('/summary', async (req, res) => {
  const deals = await prisma.deal.findMany({ where: { tenantId: req.tenantId } });
  const totalInvoiced = deals.reduce((s, d) => s + (d.invoiceAmount || 0), 0);
  const totalReceived = deals.filter((d) => d.paymentReceived).reduce((s, d) => s + (d.invoiceAmount || 0), 0);
  const totalRoyalties = deals.reduce((s, d) => s + (d.royaltiesReceived || 0), 0);
  res.json({ dealCount: deals.length, totalInvoiced, totalReceived, totalRoyalties });
});

module.exports = router;
