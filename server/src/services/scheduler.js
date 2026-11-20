const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { generateTrackDescription } = require('./openai.service');

// Replaces the "Make" automation layer for the two jobs that are safe to run
// unattended: backfilling AI descriptions for new tracks, and nothing else.
// Outreach sending and rights approval are deliberately NOT scheduled - those
// always require a human click (see outreach.routes.js and rights.routes.js).
function start() {
  cron.schedule('*/30 * * * *', async () => {
    const tracks = await prisma.track.findMany({
      where: { aiDescription: null },
      include: { tenant: true },
      take: 20,
    });

    for (const track of tracks) {
      try {
        const description = await generateTrackDescription(track.tenant, track);
        if (description) {
          await prisma.track.update({ where: { id: track.id }, data: { aiDescription: description } });
        }
      } catch (err) {
        console.error(`[scheduler] failed to describe track ${track.id}:`, err.message);
      }
    }
  });
}

module.exports = { start };
