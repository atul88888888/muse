import React, { useEffect, useState } from 'react';
import { api } from '../api';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || '').trim()));
    return row;
  });
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', jobTitle: '', email: '', industry: '' });
  const [error, setError] = useState(null);
  const [importMsg, setImportMsg] = useState(null);

  function load() { api.get('/contacts').then(setContacts).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/contacts', form);
      setForm({ firstName: '', lastName: '', jobTitle: '', email: '', industry: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleCsv(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    try {
      const res = await api.post('/contacts/import', { rows });
      setImportMsg(`Imported ${res.imported} contacts.`);
      load();
    } catch (err) { setError(err.message); }
  }

  async function toggleDnc(c) {
    await api.put(`/contacts/${c.id}`, { doNotContact: !c.doNotContact });
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <h2>Contacts</h2>
        <div className="row" style={{ flex: 'none' }}>
          <label className="secondary" style={{ display: 'inline-block' }}>
            <input type="file" accept=".csv" onChange={handleCsv} style={{ display: 'none' }} id="csv-input" />
          </label>
          <button className="secondary" onClick={() => document.getElementById('csv-input').click()}>Import CSV</button>
          <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Add contact'}</button>
        </div>
      </div>
      <p className="muted">
        This platform does not scrape LinkedIn, IMDbPro or company sites for you - that violates their terms of
        service. Source contacts yourself (or via a compliant data provider) and add them here manually or by CSV
        (columns: firstName, lastName, jobTitle, email, industry, linkedin, website, country, source).
      </p>
      {importMsg && <div className="muted">{importMsg}</div>}

      {showForm && (
        <div className="card">
          <form onSubmit={create}>
            <div className="row">
              <div><label>First name</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><label>Last name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Job title</label><input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
              <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 12 }}><button type="submit">Save contact</button></div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Status</th><th>Do not contact</th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.firstName} {c.lastName}</td>
                <td>{c.jobTitle}</td>
                <td>{c.email || '-'}</td>
                <td><span className="badge grey">{c.outreachStatus}</span></td>
                <td><button className="secondary" onClick={() => toggleDnc(c)}>{c.doNotContact ? 'Unblock' : 'Block'}</button></td>
              </tr>
            ))}
            {contacts.length === 0 && <tr><td colSpan={5} className="muted">No contacts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
