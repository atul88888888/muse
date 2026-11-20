const express = require('express');
const prisma = require('../lib/prisma');
const { scoreTrackAgainstBrief, tierFor } = require('../services/matching.service');
const { interpretBrief } = require('../services/openai.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const matches = await prisma.trackMatch.findMany({
    where: { tenantId: req.tenantId },
    include: { track: true, contact: true, company: true, opportunity: true },
    orderBy: { aiScore: 'desc' },
  });
  res.json(matches.map((m) => ({ ...m, tier: m.aiScore != null ? tierFor(m.aiScore) : null })));
});

// Runs the full catalogue against one opportunity's brief and stores a TrackMatch
// row per track. Only rights-eligible tracks score above zero on the rights
// component, and the UI should never let an un-approved track be auto-pitched.
router.post('/run/:opportunityId', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: req.params.opportunityId, tenantId: req.tenantId },
    include: { company: true },
  });
  if (!opportunity) return res.status(404).json({ error: 'Not found' });

  let brief = req.body.criteria;
  if (!brief) {
    brief = await interpretBrief(tenant, opportunity.musicRequirement || opportunity.production);
  }
  if (!brief) brief = { genres: [], moods: [], energy: null, vocals: 'either', productionType: opportunity.usage };

  const tracks = await prisma.track.findMany({
    where: { tenantId: req.tenantId, licensingStatus: { not: 'REJECTED' } },
    include: { rights: true },
  });

  const results = [];
  for (const track of tracks) {
    const rightsEligible = track.licensingStatus === 'APPROVED';
    const { score, reason } = scoreTrackAgainstBrief({ ...track, rightsEligible }, brief);

    const match = await prisma.trackMatch.create({
      data: {
        tenantId: req.tenantId,
        trackId: track.id,
        companyId: opportunity.companyId,
        opportunityId: opportunity.id,
        aiScore: score,
        aiReason: reason,
        rightsEligible,
      },
    });
    results.push(match);
  }

  res.json(results.sort((a, b) => b.aiScore - a.aiScore));
});

router.post('/:id/approve', async (req, res) => {
  const match = await prisma.trackMatch.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!match) return res.status(404).json({ error: 'Not found' });
  if (!match.rightsEligible) {
    return res.status(400).json({ error: 'Track is not rights-approved for sync licensing' });
  }
  const updated = await prisma.trackMatch.update({
    where: { id: req.params.id },
    data: { humanApproved: true, contactId: req.body.contactId || match.contactId },
  });
  res.json(updated);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.trackMatch.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { result, pitchDate } = req.body;
  const updated = await prisma.trackMatch.update({
    where: { id: req.params.id },
    data: {
      ...(result !== undefined && { result }),
      ...(pitchDate !== undefined && { pitchDate: pitchDate ? new Date(pitchDate) : null }),
    },
  });
  res.json(updated);
});

module.exports = router;
