import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_BADGE = {
  APPROVED: 'green',
  HOLD: 'amber',
  REJECTED: 'red',
  DRAFT: 'grey',
};

export default function Catalog() {
  const [tracks, setTracks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', genres: '', moods: '', bpm: '', vocals: 'instrumental' });
  const [error, setError] = useState(null);

  function load() {
    api.get('/tracks').then(setTracks).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function createTrack(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/tracks', {
        ...form,
        genres: form.genres.split(',').map((s) => s.trim()).filter(Boolean),
        moods: form.moods.split(',').map((s) => s.trim()).filter(Boolean),
        bpm: form.bpm || null,
      });
      setForm({ title: '', artist: '', genres: '', moods: '', bpm: '', vocals: 'instrumental' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <h2>Catalog</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Add track'}</button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={createTrack}>
            <div className="row">
              <div>
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label>Artist</label>
                <input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} required />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Genres (comma separated)</label>
                <input value={form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} placeholder="Electronic, Cinematic" />
              </div>
              <div>
                <label>Moods (comma separated)</label>
                <input value={form.moods} onChange={(e) => setForm({ ...form, moods: e.target.value })} placeholder="Dark, Energetic" />
              </div>
            </div>
            <div className="row">
              <div>
                <label>BPM</label>
                <input type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} />
              </div>
              <div>
                <label>Vocals</label>
                <select value={form.vocals} onChange={(e) => setForm({ ...form, vocals: e.target.value })}>
                  <option value="instrumental">Instrumental</option>
                  <option value="vocal">Vocal</option>
                </select>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 12 }}><button type="submit">Save track</button></div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Title</th><th>Artist</th><th>Genres</th><th>BPM</th><th>Licensing status</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.id}>
                <td>{t.trackCode}</td>
                <td><Link to={`/catalog/${t.id}`}>{t.title}</Link></td>
                <td>{t.artist}</td>
                <td>{(t.genres || []).join(', ')}</td>
                <td>{t.bpm || '-'}</td>
                <td><span className={`badge ${STATUS_BADGE[t.licensingStatus] || 'grey'}`}>{t.licensingStatus}</span></td>
              </tr>
            ))}
            {tracks.length === 0 && <tr><td colSpan={6} className="muted">No tracks yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
