import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trackId: '', clientName: '', production: '', licenseType: '', masterFee: '', publishingFee: '', invoiceAmount: '' });
  const [error, setError] = useState(null);

  function load() {
    api.get('/deals').then(setDeals).catch((e) => setError(e.message));
    api.get('/deals/summary').then(setSummary).catch(() => {});
  }
  useEffect(() => { load(); api.get('/tracks').then((t) => setTracks(t.filter((x) => x.licensingStatus === 'APPROVED'))).catch(() => {}); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/deals', {
        ...form,
        masterFee: form.masterFee ? Number(form.masterFee) : null,
        publishingFee: form.publishingFee ? Number(form.publishingFee) : null,
        invoiceAmount: form.invoiceAmount ? Number(form.invoiceAmount) : null,
      });
      setForm({ trackId: '', clientName: '', production: '', licenseType: '', masterFee: '', publishingFee: '', invoiceAmount: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function togglePaid(d) {
    await api.put(`/deals/${d.id}`, { paymentReceived: !d.paymentReceived });
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <h2>Deals & Royalties</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log deal'}</button>
      </div>

      {summary && (
        <div className="row" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="num">{summary.dealCount}</div><div className="label">Deals</div></div>
          <div className="stat"><div className="num">${summary.totalInvoiced.toFixed(0)}</div><div className="label">Total invoiced</div></div>
          <div className="stat"><div className="num">${summary.totalReceived.toFixed(0)}</div><div className="label">Received</div></div>
          <div className="stat"><div className="num">${summary.totalRoyalties.toFixed(0)}</div><div className="label">Royalties received</div></div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <form onSubmit={create}>
            <label>Track</label>
            <select value={form.trackId} onChange={(e) => setForm({ ...form, trackId: e.target.value })} required>
              <option value="">Select a rights-approved track...</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <div className="row">
              <div><label>Client</label><input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required /></div>
              <div><label>Production</label><input value={form.production} onChange={(e) => setForm({ ...form, production: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>License type</label><input value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} placeholder="Sync - non-exclusive" /></div>
              <div><label>Invoice amount ($)</label><input type="number" value={form.invoiceAmount} onChange={(e) => setForm({ ...form, invoiceAmount: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Master fee ($)</label><input type="number" value={form.masterFee} onChange={(e) => setForm({ ...form, masterFee: e.target.value })} /></div>
              <div><label>Publishing fee ($)</label><input type="number" value={form.publishingFee} onChange={(e) => setForm({ ...form, publishingFee: e.target.value })} /></div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 12 }}><button type="submit">Save deal</button></div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Track</th><th>Client</th><th>License type</th><th>Invoice</th><th>Paid</th></tr></thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td>{d.track?.title}</td>
                <td>{d.clientName}</td>
                <td>{d.licenseType}</td>
                <td>${(d.invoiceAmount || 0).toFixed(0)}</td>
                <td><button className="secondary" onClick={() => togglePaid(d)}>{d.paymentReceived ? 'Paid' : 'Mark paid'}</button></td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={5} className="muted">No deals logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
