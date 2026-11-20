import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function Outreach() {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const trackId = params.get('trackId');
  const opportunityId = params.get('opportunityId');

  function load() { api.get('/outreach').then(setMessages).catch((e) => setError(e.message)); }
  useEffect(() => { load(); api.get('/contacts').then((c) => setContacts(c.filter((x) => !x.doNotContact))).catch(() => {}); }, []);

  async function draft() {
    if (!contactId || !trackId) { setError('Pick a contact, and arrive here from a Match to pick a track.'); return; }
    setBusy(true); setError(null);
    try {
      await api.post('/outreach/draft', { contactId, trackIds: [trackId], opportunityId: opportunityId || undefined });
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function updateDraft(id, field, value) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  async function saveDraft(m) {
    try { await api.put(`/outreach/${m.id}`, { subject: m.subject, body: m.body }); } catch (e) { setError(e.message); }
  }

  async function send(id) {
    if (!confirm('Send this email now? This cannot be undone.')) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/outreach/${id}/send`, {});
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <h2>Outreach</h2>
      {trackId && (
        <div className="card">
          <h2>Draft a pitch for this track</h2>
          <label>Contact</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">Select a contact...</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} - {c.jobTitle}</option>)}
          </select>
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 12 }}><button disabled={busy} onClick={draft}>Generate draft</button></div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Contact</th><th>Subject</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <MessageRow key={m.id} m={m} onSave={saveDraft} onSend={send} busy={busy} />
            ))}
            {messages.length === 0 && <tr><td colSpan={4} className="muted">No outreach drafts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MessageRow({ m, onSave, onSend, busy }) {
  const [subject, setSubject] = useState(m.subject);
  const [body, setBody] = useState(m.body);
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr>
        <td>{m.contact?.firstName} {m.contact?.lastName}</td>
        <td>{subject}</td>
        <td><span className="badge grey">{m.status}</span></td>
        <td>
          <button className="secondary" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Review'}</button>
          {m.status === 'DRAFT' && <button disabled={busy} onClick={() => onSend(m.id)} style={{ marginLeft: 8 }}>Approve & send</button>}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4}>
            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={m.status !== 'DRAFT'} />
            <label>Body</label>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} disabled={m.status !== 'DRAFT'} />
            {m.status === 'DRAFT' && (
              <div style={{ marginTop: 8 }}>
                <button className="secondary" onClick={() => onSave({ id: m.id, subject, body })}>Save edits</button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
