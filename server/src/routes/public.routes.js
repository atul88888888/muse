const express = require('express');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { verifyToken } = require('../lib/auth');

const router = express.Router();

// Unauthenticated by design - this is the "private listening link" sent to an
// outside buyer who has no account. Access control comes entirely from the
// signed, time-limited token minted in tracks.routes.js, not from a session.
router.get('/preview/:token', async (req, res) => {
  let payload;
  try {
    payload = verifyToken(req.params.token);
  } catch {
    return res.status(401).send('Link expired or invalid');
  }
  if (payload.kind !== 'preview') return res.status(401).send('Invalid link');

  const track = await prisma.track.findFirst({ where: { id: payload.trackId, tenantId: payload.tenantId } });
  if (!track) return res.status(404).send('Not found');

  const filePath = track.instrumentalPath || track.wavMasterPath;
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('Audio file not available');

  res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
