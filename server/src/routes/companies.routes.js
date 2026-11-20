const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  const companies = await prisma.company.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(companies);
});

router.post('/', async (req, res) => {
  const company = await prisma.company.create({ data: { ...req.body, tenantId: req.tenantId } });
  res.status(201).json(company);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const company = await prisma.company.update({ where: { id: req.params.id }, data: req.body });
  res.json(company);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.company.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
