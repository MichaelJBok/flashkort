import { useState } from 'react'

export default function EditModal({ card, onSave, onClose }) {
  const [sv, setSv]       = useState(card.sv)
  const [en, setEn]       = useState(card.en)
  const [note, setNote]   = useState(card.note || '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const wordsChanged = sv.trim() !== card.sv || en.trim() !== card.en

  const handleSave = async () => {
    if (!sv.trim() || !en.trim()) { setError('Both fields are required.'); return }
    setSaving(true)
    const { error: err } = await onSave({ sv: sv.trim().toLowerCase(), en: en.trim().toLowerCase(), note: note.trim() })
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-title">Edit word</div>
        <div className="modal-fields">
          <div className="modal-field">
            <label>Swedish</label>
            <input
              value={sv} onChange={e => setSv(e.target.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            />
          </div>
          <div className="modal-field">
            <label>English</label>
            <input
              value={en} onChange={e => setEn(e.target.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            />
          </div>
          <div className="modal-field">
            <label>Notes (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Grammar notes, example sentences, memory tricks…" />
          </div>
        </div>
        {wordsChanged && (
          <div className="modal-note">Editing the Swedish or English text will reset this word's progress.</div>
        )}
        {error && (
          <div style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>{error}</div>
        )}
        <div className="modal-actions">
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
