import { useState } from 'react'
import { parsePaste } from '../lib/srs'

export default function ImportScreen({ onImport, direction, onDirectionChange, cards }) {
  const [text, setText]             = useState('')
  const [result, setResult]         = useState(null)
  const [importing, setImporting]   = useState(false)

  // Suggestions state
  const [suggestions, setSuggestions]     = useState([])   // [{ sv, en }]
  const [selected, setSelected]           = useState(new Set())
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestError, setSuggestError]   = useState(null)
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)

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
    const allBadLines = [...(bl || []), ...(badLines || [])]
    const hasIssues = duplicates > 0 || dbErrors.length > 0 || allBadLines.length > 0
    const type = added > 0 ? 'success' : (hasIssues ? 'warn' : 'error')
    setResult({ type, added, delimName, duplicates, dbErrors, badLines: allBadLines })
    if (added > 0) setText('')
  }

  const handleSuggest = async () => {
    setLoadingSuggestions(true)
    setSuggestError(null)
    setSuggestions([])
    setSelected(new Set())
    setSuggestionsLoaded(false)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: cards.map(c => ({ sv: c.sv, en: c.en })) }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed')
      setSuggestions(data.suggestions || [])
      setSuggestionsLoaded(true)
    } catch (err) {
      setSuggestError(err.message)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const toggleSelect = (idx) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const handleAddSelected = async () => {
    const pairs = [...selected].map(i => suggestions[i]).filter(Boolean)
    if (!pairs.length) return
    setImporting(true)
    const { added, duplicates, dbErrors } = await onImport(pairs, [])
    setImporting(false)
    // Remove added suggestions from the list
    setSuggestions(prev => prev.filter((_, i) => !selected.has(i)))
    setSelected(new Set())
    setResult({ type: added > 0 ? 'success' : 'warn', added, delimName: 'suggestion', duplicates, dbErrors, badLines: [] })
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

      {/* ── Paste import ── */}
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

      {/* ── Suggestions ── */}
      <div className="import-box solid">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="import-label" style={{ color: 'var(--text)' }}>Suggested words</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Based on your current list
            </div>
          </div>
          <button
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px', flexShrink: 0 }}
            onClick={handleSuggest}
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? '…' : suggestionsLoaded ? '🔄 Refresh' : '✨ Suggest'}
          </button>
        </div>

        {suggestError && (
          <div className="import-result error">{suggestError}</div>
        )}

        {loadingSuggestions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: '38px', borderRadius: '10px',
                background: 'var(--surface2)',
                animation: `pulse 1.4s ease-in-out ${i * 0.1}s infinite`,
              }} />
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggestions.map((s, i) => {
                const isSel = selected.has(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSel ? 'var(--accent-light)' : 'var(--surface)',
                      transition: 'all 0.12s', textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '14px',
                      color: isSel ? 'var(--accent)' : 'var(--text)',
                    }}>
                      {s.sv}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.en}</span>
                      <span style={{
                        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSel ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: 'white',
                      }}>
                        {isSel ? '✓' : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selected.size > 0 ? `${selected.size} selected` : 'Tap words to select'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.size > 0 && (
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '8px 14px' }}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </button>
                )}
                <button
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 16px', opacity: selected.size === 0 ? 0.4 : 1 }}
                  onClick={handleAddSelected}
                  disabled={selected.size === 0 || importing}
                >
                  Add {selected.size > 0 ? selected.size : ''} word{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </>
        )}

        {suggestionsLoaded && suggestions.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
            No new suggestions — try refreshing.
          </div>
        )}
      </div>

      {/* ── Direction preference ── */}
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
  if (result.type === 'error') {
    return <div className="import-result error">{result.lines?.[0] ?? 'Unknown error.'}</div>
  }
  const { added, delimName, duplicates, dbErrors, badLines } = result
  const hasIssues = duplicates > 0 || dbErrors.length > 0 || badLines.length > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {added > 0 && (
        <div className="import-result success">
          ✓ Added {added} word{added !== 1 ? 's' : ''}{delimName && delimName !== 'suggestion' ? ` (${delimName})` : ''}
        </div>
      )}
      {added === 0 && !hasIssues && <div className="import-result success">Nothing new to add.</div>}
      {duplicates > 0 && (
        <div className="import-result warn">
          {duplicates} duplicate{duplicates !== 1 ? 's' : ''} skipped — already in your list.
        </div>
      )}
      {badLines.length > 0 && (
        <div className="import-result warn">
          <div style={{ marginBottom: '5px' }}>{badLines.length} line{badLines.length !== 1 ? 's' : ''} skipped — couldn't find two columns:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {badLines.map((l, i) => (
              <code key={i} style={{ fontSize: '11px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', padding: '2px 6px', wordBreak: 'break-all' }}>{l}</code>
            ))}
          </div>
        </div>
      )}
      {dbErrors.length > 0 && (
        <div className="import-result error">
          <div style={{ marginBottom: '5px' }}>{dbErrors.length} word{dbErrors.length !== 1 ? 's' : ''} failed to save:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dbErrors.map((e, i) => (
              <div key={i} style={{ fontSize: '12px' }}>
                <code style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '4px', padding: '1px 5px' }}>{e.sv} / {e.en}</code>
                {' '}— {e.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
