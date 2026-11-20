const OpenAI = require('openai');
const { decrypt } = require('../lib/crypto');

function clientFor(tenant) {
  const apiKey = decrypt(tenant.openaiApiKeyEnc);
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function generateTrackDescription(tenant, track) {
  const client = clientFor(tenant);
  if (!client) return null;

  const prompt = `You are a music supervisor's assistant writing a short sync-licensing
description for a track, based only on the metadata below. Describe the sound, mood and
energy, and suggest 2-3 suitable sync use cases (e.g. trailers, tech ads, gaming). Keep it
to 2-3 sentences. Do not invent facts not implied by the metadata.

Title: ${track.title}
Artist: ${track.artist}
Genres: ${(track.genres || []).join(', ') || 'unspecified'}
Moods: ${(track.moods || []).join(', ') || 'unspecified'}
BPM: ${track.bpm || 'unspecified'}
Key: ${track.musicalKey || 'unspecified'}
Vocals: ${track.vocals}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content?.trim() || null;
}

async function interpretBrief(tenant, briefText) {
  const client = clientFor(tenant);
  if (!client) return null;

  const prompt = `Extract structured sync-licensing search criteria from this music brief.
Return strict JSON only, with keys: genres (array), moods (array), energy (one of low/medium/high),
vocals (one of instrumental/vocal/either), productionType (string), notes (string).

Brief: """${briefText}"""`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return null;
  }
}

async function draftPitchEmail(tenant, { contact, company, tracks, opportunity }) {
  const client = clientFor(tenant);
  if (!client) return null;

  const trackList = tracks
    .map((t) => `- "${t.title}" (${(t.genres || []).join('/')}, ${t.bpm || '?'} BPM) - ${t.aiDescription || ''}`)
    .join('\n');

  const prompt = `Write a short, professional, non-spammy sync-licensing pitch email to a
music supervisor / buyer. Be specific and low-pressure, reference their company/production
if given, and mention that private listening links are attached below (do not invent a URL -
the system inserts them separately). Sign off with a placeholder [Your name]. Return strict
JSON with keys "subject" and "body" only.

Recipient: ${contact.firstName} ${contact.lastName || ''}, ${contact.jobTitle || ''} at ${company?.name || 'their company'}
Opportunity / brief (if any): ${opportunity?.musicRequirement || opportunity?.production || 'none specified - general introduction'}

Tracks being pitched:
${trackList}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return null;
  }
}

module.exports = { generateTrackDescription, interpretBrief, draftPitchEmail };
