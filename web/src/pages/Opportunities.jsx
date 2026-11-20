import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ production: '', companyId: '', musicRequirement: '', usage: '', status: 'RESEARCHING' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function load() { api.get('/opportunities').then(setOpportunities).catch((e) => setError(e.message)); }
  useEffect(() => { load(); api.get('/companies').then(setCompanies).catch(() => {}); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/opportunities', { ...form, companyId: form.companyId || null });
      setForm({ production: '', companyId: '', musicRequirement: '', usage: '', status: 'RESEARCHING' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function runMatching(id) {
    await api.post(`/matches/run/${id}`);
    navigate('/matches');
  }

  return (
    <div>
      <div className="toolbar">
        <h2>Opportunities</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log opportunity'}</button>
      </div>
      {showForm && (
        <div className="card">
          <form onSubmit={create}>
            <label>Production / project name</label>
            <input value={form.production} onChange={(e) => setForm({ ...form, production: e.target.value })} required />
            <label>Company</label>
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
              <option value="">Unknown / none yet</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label>Music requirement / brief</label>
            <textarea rows={3} value={form.musicRequirement} onChange={(e) => setForm({ ...form, musicRequirement: e.target.value })} placeholder="e.g. futuristic electronic, confident, no vocals, for a technology commercial" />
            <label>Usage</label>
            <input value={form.usage} onChange={(e) => setForm({ ...form, usage: e.target.value })} placeholder="e.g. video game soundtrack" />
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 12 }}><button type="submit">Save opportunity</button></div>
          </form>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Production</th><th>Brief</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id}>
                <td>{o.production}</td>
                <td className="muted">{o.musicRequirement}</td>
                <td><span className="badge grey">{o.status}</span></td>
                <td><button className="secondary" onClick={() => runMatching(o.id)}>Run matching</button></td>
              </tr>
            ))}
            {opportunities.length === 0 && <tr><td colSpan={4} className="muted">No opportunities logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
