import { useState } from 'react'
import { parsePaste } from '../lib/srs'

export default function ImportScreen({ onImport, direction, onDirectionChange }) {
  const [text, setText]         = useState('')
  const [result, setResult]     = useState(null)   // { type, msg }
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!text.trim()) { setResult({ type: 'error', msg: 'Nothing to import.' }); return }
    const { pairs, delimName } = parsePaste(text)
    if (!delimName) { setResult({ type: 'error', msg: 'Could not detect a delimiter. Use tabs, commas, dashes, or multiple spaces.' }); return }

    setImporting(true)
    const { added, skipped, error } = await onImport(pairs)
    setImporting(false)

    if (error) { setResult({ type: 'error', msg: error }); return }

    setResult({ type: 'success', msg: `✓ Added ${added} word${added !== 1 ? 's' : ''} (${delimName})${skipped > 0 ? ` · ${skipped} skipped` : ''}` })
    if (added > 0) setText('')
  }

  const dirs = [
    { id: 'sv-en', label: '🇸🇪 → 🇬🇧' },
    { id: 'en-sv', label: '🇬🇧 → 🇸🇪' },
    { id: 'both',  label: 'Both' },
  ]

  return (
    <div className="screen-scroll">
      <div className="screen-title">Add words</div>
      <div className="screen-subtitle">Paste a list — one pair per line, any delimiter.</div>

      <div className="import-box">
        <label className="import-label">Swedish ↔ English — one pair per line</label>
        <div className="example-text">{`hej\t\thello\ntack, thank you\nförstår - understand\ngod morgon    good morning`}</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your word list here…"
          style={{ minHeight: '160px' }}
        />
        <div className="import-actions">
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button className="btn-secondary" onClick={() => setText('')}>Clear</button>
        </div>
        {result && (
          <div className={`import-result ${result.type}`}>{result.msg}</div>
        )}
      </div>

      <div className="import-box solid">
        <label className="import-label" style={{ color: 'var(--text)' }}>Direction preference</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {dirs.map(d => (
            <button
              key={d.id}
              className="btn-secondary"
              style={{
                flex: 1,
                background:   direction === d.id ? 'var(--accent-light)' : '',
                color:        direction === d.id ? 'var(--accent)' : '',
                borderColor:  direction === d.id ? 'var(--accent)' : '',
              }}
              onClick={() => onDirectionChange(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
