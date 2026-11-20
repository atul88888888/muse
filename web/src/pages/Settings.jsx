import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Settings() {
  const [tenant, setTenant] = useState(null);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get('/tenants/me').then((t) => {
      setTenant(t);
      setSmtpHost(t.smtpHost || '');
      setSmtpPort(t.smtpPort ? String(t.smtpPort) : '587');
      setSmtpUser(t.smtpUser || '');
      setFromEmail(t.fromEmail || '');
      setFromName(t.fromName || '');
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setStatus(null);
    const payload = { smtpHost, smtpPort, smtpUser, fromEmail, fromName };
    if (openaiApiKey) payload.openaiApiKey = openaiApiKey;
    if (smtpPass) payload.smtpPass = smtpPass;
    try {
      await api.put('/tenants/me/integrations', payload);
      setStatus('Saved.');
      setOpenaiApiKey('');
      setSmtpPass('');
    } catch (err) { setStatus(err.message); }
  }

  if (!tenant) return <div className="muted">Loading...</div>;

  return (
    <div>
      <h2>Settings</h2>
      <div className="card">
        <h2>Account</h2>
        <p className="muted">Tenant: {tenant.name} (slug: {tenant.slug})</p>
      </div>

      <div className="card">
        <h2>Integrations</h2>
        <p className="muted">
          Bring your own keys - each tenant pays for and controls their own OpenAI usage and email sending.
          Keys are encrypted at rest and never shown back to the browser once saved.
        </p>
        <form onSubmit={save}>
          <label>OpenAI API key {tenant.hasOpenaiKey && <span className="badge green">configured</span>}</label>
          <input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} placeholder={tenant.hasOpenaiKey ? 'Leave blank to keep existing key' : 'sk-...'} />

          <h2 style={{ marginTop: 24 }}>Outreach email (SMTP)</h2>
          <div className="row">
            <div><label>SMTP host</label><input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div><label>SMTP port</label><input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} /></div>
          </div>
          <label>SMTP username</label>
          <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          <label>SMTP password / app password {tenant.hasSmtpPass && <span className="badge green">configured</span>}</label>
          <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder={tenant.hasSmtpPass ? 'Leave blank to keep existing' : ''} />
          <div className="row">
            <div><label>From name</label><input value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
            <div><label>From email</label><input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
          </div>

          {status && <div className="muted">{status}</div>}
          <div style={{ marginTop: 12 }}><button type="submit">Save integrations</button></div>
        </form>
      </div>
    </div>
  );
}
