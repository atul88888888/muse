const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { generateTrackDescription } = require('../services/openai.service');
const { signPreviewToken } = require('../lib/auth');

const router = express.Router();

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.tenantId, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

function nextTrackCode(count) {
  return `MUS${String(count + 1).padStart(3, '0')}`;
}

router.get('/', async (req, res) => {
  const tracks = await prisma.track.findMany({
    where: { tenantId: req.tenantId },
    include: { rights: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tracks);
});

router.get('/:id', async (req, res) => {
  const track = await prisma.track.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { rights: true },
  });
  if (!track) return res.status(404).json({ error: 'Not found' });
  res.json(track);
});

router.post('/', async (req, res) => {
  const count = await prisma.track.count({ where: { tenantId: req.tenantId } });
  const track = await prisma.track.create({
    data: {
      tenantId: req.tenantId,
      trackCode: nextTrackCode(count),
      title: req.body.title,
      artist: req.body.artist,
      genres: req.body.genres || [],
      subgenres: req.body.subgenres || [],
      moods: req.body.moods || [],
      bpm: req.body.bpm ? Number(req.body.bpm) : null,
      musicalKey: req.body.musicalKey || null,
      vocals: req.body.vocals || 'instrumental',
      spotifyUrl: req.body.spotifyUrl || null,
      soundcloudUrl: req.body.soundcloudUrl || null,
      isrc: req.body.isrc || null,
      iswc: req.body.iswc || null,
      rights: { create: {} }, // every track starts with an empty rights-clearance record
    },
    include: { rights: true },
  });
  res.status(201).json(track);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.track.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, artist, genres, subgenres, moods, bpm, musicalKey, vocals, spotifyUrl, soundcloudUrl, isrc, iswc, licensingStatus } = req.body;
  const track = await prisma.track.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(artist !== undefined && { artist }),
      ...(genres !== undefined && { genres }),
      ...(subgenres !== undefined && { subgenres }),
      ...(moods !== undefined && { moods }),
      ...(bpm !== undefined && { bpm: bpm ? Number(bpm) : null }),
      ...(musicalKey !== undefined && { musicalKey }),
      ...(vocals !== undefined && { vocals }),
      ...(spotifyUrl !== undefined && { spotifyUrl }),
      ...(soundcloudUrl !== undefined && { soundcloudUrl }),
      ...(isrc !== undefined && { isrc }),
      ...(iswc !== undefined && { iswc }),
      // licensingStatus may only ever move to APPROVED via the rights-approval route,
      // never through this general-purpose edit endpoint.
      ...(licensingStatus !== undefined && licensingStatus !== 'APPROVED' && { licensingStatus }),
    },
  });
  res.json(track);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.track.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.track.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post(
  '/:id/files',
  upload.fields([
    { name: 'wavMaster', maxCount: 1 },
    { name: 'instrumental', maxCount: 1 },
    { name: 'stems', maxCount: 1 },
  ]),
  async (req, res) => {
    const existing = await prisma.track.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const data = {};
    if (req.files.wavMaster) data.wavMasterPath = req.files.wavMaster[0].path;
    if (req.files.instrumental) data.instrumentalPath = req.files.instrumental[0].path;
    if (req.files.stems) data.stemsPath = req.files.stems[0].path;

    const track = await prisma.track.update({ where: { id: req.params.id }, data });
    res.json(track);
  }
);

// Automation 1 (ingestion): generate the AI description/tag suggestion for a track.
// Requires the tenant to have already saved their own OpenAI key in Settings.
router.post('/:id/ai-describe', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  const track = await prisma.track.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!track) return res.status(404).json({ error: 'Not found' });

  const description = await generateTrackDescription(tenant, track);
  if (!description) {
    return res.status(400).json({ error: 'Add an OpenAI API key in Settings first' });
  }

  const updated = await prisma.track.update({ where: { id: track.id }, data: { aiDescription: description } });
  res.json(updated);
});

// Mints a time-limited private listening link for an outside buyer with no account.
router.post('/:id/preview-link', async (req, res) => {
  const track = await prisma.track.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!track) return res.status(404).json({ error: 'Not found' });
  const token = signPreviewToken(req.tenantId, track.id);
  res.json({ token, path: `/api/public/preview/${token}` });
});

module.exports = router;
