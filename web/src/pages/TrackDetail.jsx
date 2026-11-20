import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const CLEARANCE_BADGE = {
  GREEN_CLEARED: 'green',
  BLUE_ORIGINAL: 'blue',
  AMBER_PENDING: 'amber',
  RED_NOT_LICENSABLE: 'red',
};

export default function TrackDetail() {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [rights, setRights] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewLink, setPreviewLink] = useState(null);

  function load() {
    api.get(`/tracks/${id}`).then((t) => { setTrack(t); setRights(t.rights); }).catch((e) => setError(e.message));
  }
  useEffect(load, [id]);

  async function aiDescribe() {
    setBusy(true); setError(null);
    try {
      const t = await api.post(`/tracks/${id}/ai-describe`);
      setTrack(t);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function uploadFiles(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    setBusy(true); setError(null);
    try {
      const t = await api.upload(`/tracks/${id}/files`, form);
      setTrack(t);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function saveRights(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = {
      masterOwner: form.get('masterOwner'),
      compositionOwner: form.get('compositionOwner'),
      producerAgreementConfirmed: form.get('producerAgreementConfirmed') === 'on',
      sampleUsed: form.get('sampleUsed') === 'on',
      sampleSource: form.get('sampleSource'),
      sampleOwner: form.get('sampleOwner'),
      masterSampleClearance: form.get('masterSampleClearance'),
      compositionClearance: form.get('compositionClearance'),
      territoryRestrictions: form.get('territoryRestrictions'),
      commercialUsePermitted: form.get('commercialUsePermitted') === 'on',
      syncUsePermitted: form.get('syncUsePermitted') === 'on',
      exclusiveLicensingPermitted: form.get('exclusiveLicensingPermitted') === 'on',
    };
    setBusy(true); setError(null);
    try {
      const r = await api.put(`/rights/${id}`, payload);
      setRights(r);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function aiSuggest() {
    setBusy(true); setError(null);
    try {
      const r = await api.post(`/rights/${id}/ai-suggest`);
      setRights(r);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function humanApprove(finalStatus) {
    if (!confirm(`Confirm: set final clearance status to ${finalStatus}? This determines whether the track can be pitched.`)) return;
    setBusy(true); setError(null);
    try {
      const r = await api.post(`/rights/${id}/approve`, { finalStatus });
      setRights(r);
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function getPreviewLink() {
    const { path } = await api.post(`/tracks/${id}/preview-link`);
    setPreviewLink(window.location.origin + path);
  }

  if (!track) return <div className="muted">Loading...</div>;

  return (
    <div>
      <Link to="/catalog" className="muted">&larr; Back to catalog</Link>
      <h2>{track.title} <span className="muted">by {track.artist}</span></h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>AI description</h2>
          <button className="secondary" disabled={busy} onClick={aiDescribe}>Generate / refresh</button>
        </div>
        <p>{track.aiDescription || <span className="muted">No AI description yet. Add an OpenAI key in Settings, then click Generate.</span>}</p>
      </div>

      <div className="card">
        <h2>Audio files</h2>
        <form onSubmit={uploadFiles}>
          <div className="row">
            <div><label>WAV master</label><input type="file" name="wavMaster" /></div>
            <div><label>Instrumental</label><input type="file" name="instrumental" /></div>
            <div><label>Stems (zip)</label><input type="file" name="stems" /></div>
          </div>
          <div style={{ marginTop: 12 }}><button disabled={busy} type="submit">Upload</button></div>
        </form>
        <div style={{ marginTop: 12 }}>
          <button className="secondary" onClick={getPreviewLink}>Create private listening link</button>
          {previewLink && <div className="muted" style={{ marginTop: 8 }}>{previewLink}</div>}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Rights clearance</h2>
          {rights?.finalStatus && <span className={`badge ${CLEARANCE_BADGE[rights.finalStatus]}`}>{rights.finalStatus}</span>}
        </div>
        <p className="muted">
          A track being on Spotify/SoundCloud does not mean it is cleared for sync. Fill in what you know below,
          then use AI suggest for a starting read - only a human can give final approval.
        </p>
        {rights && (
          <form onSubmit={saveRights}>
            <div className="row">
              <div><label>Master recording owner</label><input name="masterOwner" defaultValue={rights.masterOwner || ''} /></div>
              <div><label>Composition owner</label><input name="compositionOwner" defaultValue={rights.compositionOwner || ''} /></div>
            </div>
            <label><input type="checkbox" name="producerAgreementConfirmed" defaultChecked={rights.producerAgreementConfirmed} style={{ width: 'auto', marginRight: 8 }} />Producer agreement confirmed</label>
            <label><input type="checkbox" name="sampleUsed" defaultChecked={rights.sampleUsed} style={{ width: 'auto', marginRight: 8 }} />Sample used</label>
            <div className="row">
              <div><label>Sample source</label><input name="sampleSource" defaultValue={rights.sampleSource || ''} /></div>
              <div><label>Sample owner</label><input name="sampleOwner" defaultValue={rights.sampleOwner || ''} /></div>
            </div>
            <div className="row">
              <div>
                <label>Master sample clearance</label>
                <select name="masterSampleClearance" defaultValue={rights.masterSampleClearance}>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                </select>
              </div>
              <div>
                <label>Composition clearance</label>
                <select name="compositionClearance" defaultValue={rights.compositionClearance}>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                </select>
              </div>
            </div>
            <label>Territory restrictions</label>
            <input name="territoryRestrictions" defaultValue={rights.territoryRestrictions || ''} placeholder="Worldwide, or list excluded territories" />
            <label><input type="checkbox" name="commercialUsePermitted" defaultChecked={rights.commercialUsePermitted} style={{ width: 'auto', marginRight: 8 }} />Commercial use permitted</label>
            <label><input type="checkbox" name="syncUsePermitted" defaultChecked={rights.syncUsePermitted} style={{ width: 'auto', marginRight: 8 }} />Sync use permitted (distinct from streaming-only clearance)</label>
            <label><input type="checkbox" name="exclusiveLicensingPermitted" defaultChecked={rights.exclusiveLicensingPermitted} style={{ width: 'auto', marginRight: 8 }} />Exclusive licensing permitted</label>
            <div style={{ marginTop: 12 }}><button disabled={busy} type="submit">Save clearance details</button></div>
          </form>
        )}

        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button className="secondary" disabled={busy} onClick={aiSuggest}>AI: suggest a status (non-binding)</button>
          {rights?.aiSuggestedStatus && (
            <p className="muted">AI suggestion: <span className={`badge ${CLEARANCE_BADGE[rights.aiSuggestedStatus]}`}>{rights.aiSuggestedStatus}</span> - {rights.aiSuggestionNotes}</p>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label>Human final approval (required before this track can be pitched)</label>
          <div className="row">
            <button disabled={busy} onClick={() => humanApprove('GREEN_CLEARED')}>Approve: Fully cleared</button>
            <button disabled={busy} onClick={() => humanApprove('BLUE_ORIGINAL')}>Approve: Original/verified</button>
            <button className="secondary" disabled={busy} onClick={() => humanApprove('AMBER_PENDING')}>Mark: Pending</button>
            <button className="danger" disabled={busy} onClick={() => humanApprove('RED_NOT_LICENSABLE')}>Mark: Not licensable</button>
          </div>
        </div>
      </div>
    </div>
  );
}
