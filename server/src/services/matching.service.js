// Deterministic, explainable match scoring (cheap - no ML infra needed).
// Weights follow the brief: genre/style 20, mood/atmosphere 20, production type 20,
// tempo/energy 10, instrumentation/vocals 10, similarity to previous work 10,
// rights eligibility 10. OpenAI is used elsewhere only to produce descriptive text,
// not to decide the numeric score - keeps scoring reproducible and auditable.

function overlapRatio(a = [], b = []) {
  const setA = new Set(a.map((x) => String(x).toLowerCase()));
  const setB = new Set(b.map((x) => String(x).toLowerCase()));
  if (setA.size === 0 || setB.size === 0) return 0;
  let hits = 0;
  for (const v of setA) if (setB.has(v)) hits++;
  return hits / Math.max(setA.size, setB.size);
}

function textContainsAny(haystack = '', needles = []) {
  const h = haystack.toLowerCase();
  return needles.some((n) => n && h.includes(String(n).toLowerCase()));
}

function scoreTrackAgainstBrief(track, brief) {
  const reasons = [];
  let score = 0;

  // Genre / style - 20%
  const genreOverlap = overlapRatio(track.genres, brief.genres || []);
  score += genreOverlap * 20;
  if (genreOverlap > 0) reasons.push(`genre overlap (${track.genres.join(', ')})`);

  // Mood / atmosphere - 20%
  const moodOverlap = overlapRatio(track.moods, brief.moods || []);
  score += moodOverlap * 20;
  if (moodOverlap > 0) reasons.push(`mood overlap (${track.moods.join(', ')})`);

  // Production type - 20% (matched against free text requirement/production fields)
  const prodMatch = brief.productionType
    ? textContainsAny(`${track.genres.join(' ')} ${track.aiDescription || ''}`, [brief.productionType])
    : false;
  if (prodMatch) {
    score += 20;
    reasons.push(`fits production type "${brief.productionType}"`);
  } else if (brief.productionType) {
    score += 8; // partial credit - unknown fit, not a mismatch
  } else {
    score += 10;
  }

  // Tempo / energy - 10%
  if (brief.energy && track.bpm) {
    const energyBand = track.bpm < 90 ? 'low' : track.bpm < 125 ? 'medium' : 'high';
    if (energyBand === brief.energy) {
      score += 10;
      reasons.push(`tempo matches requested ${brief.energy} energy`);
    } else {
      score += 3;
    }
  } else {
    score += 5;
  }

  // Instrumentation / vocals - 10%
  if (brief.vocals && brief.vocals !== 'either') {
    const wantInstrumental = brief.vocals === 'instrumental';
    const trackIsInstrumental = track.vocals === 'instrumental';
    if (wantInstrumental === trackIsInstrumental) {
      score += 10;
      reasons.push('vocal requirement matches');
    } else {
      score += 0;
    }
  } else {
    score += 10;
  }

  // Similarity to previous placements - 10% (flat credit for MVP; refine once deal history exists)
  score += 5;

  // Rights eligibility - 10%
  if (track.rightsEligible) {
    score += 10;
    reasons.push('rights cleared for sync use');
  } else {
    reasons.push('NOT rights-cleared for sync - excluded from auto-pitch');
  }

  return {
    score: Math.round(Math.min(100, score)),
    reason: reasons.join('; '),
  };
}

function tierFor(score) {
  if (score >= 85) return 'HIGH_PRIORITY';
  if (score >= 70) return 'REVIEW_MANUALLY';
  return 'DO_NOT_PITCH';
}

module.exports = { scoreTrackAgainstBrief, tierFor };
