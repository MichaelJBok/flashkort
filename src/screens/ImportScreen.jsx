import { useState } from 'react'
import { parsePaste } from '../lib/srs'

export default function ImportScreen({ onImport, direction, onDirectionChange }) {
  const [text, setText]           = useState('')
  const [result, setResult]       = useState(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!text.trim()) { setResult({ type: 'error', lines: ['Nothing to import.'] }); return }
    const { pairs, delimName, badLines } = parsePaste(text)
    if (!delimName) {
      setResult({ type: 'error', lines: ['Could not detect a delimiter. Use tabs, commas, dashes, or multiple spaces.'] })
      return
    }

    setImporting(true)
    const { added, duplicates, dbErrors, badLines: bl } = await onImport(pairs, badLines)
    setImporting(false)

    // Build a structured result to render
    const allBadLines = [...(bl || []), ...(badLines || [])]
    const hasIssues = duplicates > 0 || dbErrors.length > 0 || allBadLines.length > 0
    const type = added > 0 ? 'success' : (hasIssues ? 'warn' : 'error')

    setResult({ type, added, delimName, duplicates, dbErrors, badLines: allBadLines })
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
          <button className="btn-secondary" onClick={() => { setText(''); setResult(null) }}>Clear</button>
        </div>

        {result && <ImportResult result={result} />}
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
                background:  direction === d.id ? 'var(--accent-light)' : '',
                color:       direction === d.id ? 'var(--accent)'       : '',
                borderColor: direction === d.id ? 'var(--accent)'       : '',
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

function ImportResult({ result }) {
  // Plain error (no import attempted)
  if (result.type === 'error') {
    return (
      <div className="import-result error">
        {result.lines?.[0] ?? 'Unknown error.'}
      </div>
    )
  }

  const { added, delimName, duplicates, dbErrors, badLines } = result
  const hasIssues = duplicates > 0 || dbErrors.length > 0 || badLines.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Success line */}
      {added > 0 && (
        <div className="import-result success">
          ✓ Added {added} word{added !== 1 ? 's' : ''}{delimName ? ` (${delimName})` : ''}
        </div>
      )}

      {added === 0 && !hasIssues && (
        <div className="import-result success">Nothing new to add.</div>
      )}

      {/* Duplicates */}
      {duplicates > 0 && (
        <div className="import-result warn">
          {duplicates} duplicate{duplicates !== 1 ? 's' : ''} skipped — already in your list.
        </div>
      )}

      {/* Lines that couldn't be parsed */}
      {badLines.length > 0 && (
        <div className="import-result warn">
          <div style={{ marginBottom: '5px' }}>
            {badLines.length} line{badLines.length !== 1 ? 's' : ''} skipped — couldn't find two columns:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {badLines.map((l, i) => (
              <code key={i} style={{ fontSize: '11px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', padding: '2px 6px', wordBreak: 'break-all' }}>
                {l}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* DB-level errors */}
      {dbErrors.length > 0 && (
        <div className="import-result error">
          <div style={{ marginBottom: '5px' }}>
            {dbErrors.length} word{dbErrors.length !== 1 ? 's' : ''} failed to save:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dbErrors.map((e, i) => (
              <div key={i} style={{ fontSize: '12px' }}>
                <code style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '4px', padding: '1px 5px' }}>
                  {e.sv} / {e.en}
                </code>
                {' '}— {e.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
