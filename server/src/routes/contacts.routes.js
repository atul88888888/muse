const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  const contacts = await prisma.contact.findMany({
    where: { tenantId: req.tenantId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(contacts);
});

router.post('/', async (req, res) => {
  const contact = await prisma.contact.create({ data: { ...req.body, tenantId: req.tenantId } });
  res.status(201).json(contact);
});

// CSV import for contact discovery - manual/sourced lists only, never a scraper.
// Expects an already-parsed array of row objects from the frontend's CSV parser.
router.post('/import', async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });

  const created = await prisma.$transaction(
    rows.map((row) =>
      prisma.contact.create({
        data: {
          tenantId: req.tenantId,
          firstName: row.firstName || row.first_name || 'Unknown',
          lastName: row.lastName || row.last_name || null,
          jobTitle: row.jobTitle || row.job_title || null,
          industry: row.industry || null,
          email: row.email || null,
          linkedin: row.linkedin || null,
          website: row.website || null,
          country: row.country || null,
          source: row.source || 'csv-import',
          verification: 'UNVERIFIED',
        },
      })
    )
  );
  res.status(201).json({ imported: created.length });
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const contact = await prisma.contact.update({ where: { id: req.params.id }, data: req.body });
  res.json(contact);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
