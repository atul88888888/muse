import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/tracks').then(setTracks).catch(() => {});
    api.get('/contacts').then(setContacts).catch(() => {});
    api.get('/outreach').then(setOutreach).catch(() => {});
    api.get('/deals/summary').then(setSummary).catch(() => {});
  }, []);

  const approved = tracks.filter((t) => t.licensingStatus === 'APPROVED').length;
  const sent = outreach.filter((o) => o.status === 'SENT').length;
  const replied = outreach.filter((o) => o.response).length;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="row">
        <div className="stat"><div className="num">{tracks.length}</div><div className="label">Tracks in catalogue</div></div>
        <div className="stat"><div className="num">{approved}</div><div className="label">Rights-approved for sync</div></div>
        <div className="stat"><div className="num">{contacts.length}</div><div className="label">Contacts</div></div>
        <div className="stat"><div className="num">{sent}</div><div className="label">Pitches sent</div></div>
        <div className="stat"><div className="num">{replied}</div><div className="label">Replies received</div></div>
        <div className="stat"><div className="num">${summary?.totalReceived?.toFixed(0) || 0}</div><div className="label">Revenue received</div></div>
      </div>

      <div className="card">
        <h2>Getting started</h2>
        <ol className="muted">
          <li>Add your OpenAI key and SMTP sending credentials in <b>Settings</b>.</li>
          <li>Upload your tracks in <b>Catalog</b>, then complete each track's Rights Clearance tab — no track can be pitched until you (a human) approve it there.</li>
          <li>Add companies and contacts under <b>Companies</b> / <b>Contacts</b> (manual entry or CSV import).</li>
          <li>Log a brief in <b>Opportunities</b> and run matching to score your catalogue against it.</li>
          <li>Review scored matches in <b>Matches</b>, approve the ones worth pitching, then draft and send from <b>Outreach</b>.</li>
        </ol>
      </div>
    </div>
  );
}
