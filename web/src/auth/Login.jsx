import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Login() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { tenantSlug, email, password });
      setSession(data.token, data.tenant);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-box">
        <h2>Log in</h2>
        <form onSubmit={submit}>
          <label>Tenant slug</label>
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="your-label" required />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 16 }}>
            <button disabled={loading} type="submit">Log in</button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          No account yet? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
