import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', industry: '', country: '', productionType: '' });
  const [error, setError] = useState(null);

  function load() { api.get('/companies').then(setCompanies).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/companies', form);
      setForm({ name: '', website: '', industry: '', country: '', productionType: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <div className="toolbar">
        <h2>Companies</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Add company'}</button>
      </div>
      {showForm && (
        <div className="card">
          <form onSubmit={create}>
            <div className="row">
              <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label>Website</label><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div className="row">
              <div>
                <label>Industry</label>
                <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select...</option>
                  <option>Film & TV</option>
                  <option>Advertising</option>
                  <option>Video games</option>
                  <option>Trailers & promos</option>
                  <option>Other</option>
                </select>
              </div>
              <div><label>Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <label>Production type / notes</label>
            <input value={form.productionType} onChange={(e) => setForm({ ...form, productionType: e.target.value })} />
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 12 }}><button type="submit">Save company</button></div>
          </form>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Industry</th><th>Country</th><th>Website</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td>{c.industry}</td><td>{c.country}</td><td>{c.website ? <a href={c.website} target="_blank" rel="noreferrer">{c.website}</a> : '-'}</td></tr>
            ))}
            {companies.length === 0 && <tr><td colSpan={4} className="muted">No companies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
