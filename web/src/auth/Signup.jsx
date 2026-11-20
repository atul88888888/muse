import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Signup() {
  const [tenantName, setTenantName] = useState('');
  const [name, setName] = useState('');
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
      const data = await api.post('/auth/signup', { tenantName, name, email, password });
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
        <h2>Create your account</h2>
        <form onSubmit={submit}>
          <label>Label / artist / agency name</label>
          <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password (min. 10 characters)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 16 }}>
            <button disabled={loading} type="submit">Create account</button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
