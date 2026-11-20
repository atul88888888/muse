const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

async function loadForTenant(trackId, tenantId) {
  return prisma.rightsClearance.findFirst({
    where: { trackId, track: { tenantId } },
    include: { track: true },
  });
}

router.get('/:trackId', async (req, res) => {
  const rights = await loadForTenant(req.params.trackId, req.tenantId);
  if (!rights) return res.status(404).json({ error: 'Not found' });
  res.json(rights);
});

// Editing the clearance questionnaire never touches finalStatus - that is only ever
// set by the separate /approve endpoint below, which requires a human owner/admin.
router.put('/:trackId', async (req, res) => {
  const rights = await loadForTenant(req.params.trackId, req.tenantId);
  if (!rights) return res.status(404).json({ error: 'Not found' });

  const {
    masterOwner, compositionOwner, producerAgreementConfirmed, sampleUsed, sampleSource,
    sampleOwner, masterSampleClearance, compositionClearance, territoryRestrictions,
    commercialUsePermitted, syncUsePermitted, exclusiveLicensingPermitted,
  } = req.body;

  const updated = await prisma.rightsClearance.update({
    where: { id: rights.id },
    data: {
      ...(masterOwner !== undefined && { masterOwner }),
      ...(compositionOwner !== undefined && { compositionOwner }),
      ...(producerAgreementConfirmed !== undefined && { producerAgreementConfirmed }),
      ...(sampleUsed !== undefined && { sampleUsed }),
      ...(sampleSource !== undefined && { sampleSource }),
      ...(sampleOwner !== undefined && { sampleOwner }),
      ...(masterSampleClearance !== undefined && { masterSampleClearance }),
      ...(compositionClearance !== undefined && { compositionClearance }),
      ...(territoryRestrictions !== undefined && { territoryRestrictions }),
      ...(commercialUsePermitted !== undefined && { commercialUsePermitted }),
      ...(syncUsePermitted !== undefined && { syncUsePermitted }),
      ...(exclusiveLicensingPermitted !== undefined && { exclusiveLicensingPermitted }),
      // clearing any field invalidates a prior final approval - must be re-approved
      finalStatus: null,
      finalApprovedByUserId: null,
      finalApprovedAt: null,
    },
  });
  res.json(updated);
});

// AI may only write a *suggestion* - never the final status.
router.post('/:trackId/ai-suggest', async (req, res) => {
  const rights = await loadForTenant(req.params.trackId, req.tenantId);
  if (!rights) return res.status(404).json({ error: 'Not found' });

  let suggestion = 'AMBER_PENDING';
  const notes = [];
  if (rights.sampleUsed && (rights.masterSampleClearance !== 'CONFIRMED' || rights.compositionClearance !== 'CONFIRMED')) {
    suggestion = 'RED_NOT_LICENSABLE';
    notes.push('Sample used but master/composition sample clearance not confirmed.');
  } else if (!rights.sampleUsed && rights.masterOwner && rights.compositionOwner && rights.producerAgreementConfirmed) {
    suggestion = 'BLUE_ORIGINAL';
    notes.push('No sample; ownership and producer agreement documented.');
  } else if (rights.sampleUsed && rights.masterSampleClearance === 'CONFIRMED' && rights.compositionClearance === 'CONFIRMED' && rights.syncUsePermitted) {
    suggestion = 'GREEN_CLEARED';
    notes.push('Sample cleared for sync use specifically (not just streaming).');
  } else {
    notes.push('Missing ownership, producer agreement, or sync-use permission details.');
  }

  const updated = await prisma.rightsClearance.update({
    where: { id: rights.id },
    data: { aiSuggestedStatus: suggestion, aiSuggestionNotes: notes.join(' ') },
  });
  res.json(updated);
});

// The only place a track can become licensable. Requires an authenticated human
// with OWNER/ADMIN role - the brief is explicit that AI/automation must never do this.
router.post('/:trackId/approve', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  const { finalStatus } = req.body;
  if (!['GREEN_CLEARED', 'BLUE_ORIGINAL', 'AMBER_PENDING', 'RED_NOT_LICENSABLE'].includes(finalStatus)) {
    return res.status(400).json({ error: 'Invalid finalStatus' });
  }

  const rights = await loadForTenant(req.params.trackId, req.tenantId);
  if (!rights) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.rightsClearance.update({
    where: { id: rights.id },
    data: {
      finalStatus,
      finalApprovedByUserId: req.userId,
      finalApprovedAt: new Date(),
    },
  });

  const licensable = finalStatus === 'GREEN_CLEARED' || finalStatus === 'BLUE_ORIGINAL';
  await prisma.track.update({
    where: { id: req.params.trackId },
    data: { licensingStatus: licensable ? 'APPROVED' : finalStatus === 'RED_NOT_LICENSABLE' ? 'REJECTED' : 'HOLD' },
  });

  res.json(updated);
});

module.exports = router;
