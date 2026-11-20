import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const TIER_BADGE = { HIGH_PRIORITY: 'green', REVIEW_MANUALLY: 'amber', DO_NOT_PITCH: 'red' };

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function load() { api.get('/matches').then(setMatches).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function approve(id) {
    try {
      await api.post(`/matches/${id}/approve`, {});
      load();
    } catch (e) { setError(e.message); }
  }

  function pitch(m) {
    navigate(`/outreach?trackId=${m.trackId}&opportunityId=${m.opportunityId || ''}`);
  }

  return (
    <div>
      <h2>Matches</h2>
      <p className="muted">
        85-100 = high priority, 70-84 = review manually, below 70 = don't pitch. These are internal
        prioritisation scores, not predictions that a buyer will actually license the track. Only
        rights-approved tracks can be approved for pitching.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Track</th><th>Opportunity</th><th>Score</th><th>Tier</th><th>Reason</th><th>Rights OK</th><th></th></tr></thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td>{m.track?.title}</td>
                <td>{m.opportunity?.production || '-'}</td>
                <td>{m.aiScore}</td>
                <td><span className={`badge ${TIER_BADGE[m.tier] || 'grey'}`}>{m.tier}</span></td>
                <td className="muted" style={{ maxWidth: 320 }}>{m.aiReason}</td>
                <td>{m.rightsEligible ? 'Yes' : 'No'}</td>
                <td>
                  {!m.humanApproved ? (
                    <button className="secondary" disabled={!m.rightsEligible} onClick={() => approve(m.id)}>Approve</button>
                  ) : (
                    <button onClick={() => pitch(m)}>Pitch</button>
                  )}
                </td>
              </tr>
            ))}
            {matches.length === 0 && <tr><td colSpan={7} className="muted">No matches yet - run matching from an Opportunity.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
