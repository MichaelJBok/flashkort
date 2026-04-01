import { useState, useMemo, useEffect, useRef } from 'react'
import { buildQueue } from '../lib/srs'

const FLIP_MS = 500 // must match CSS transition duration

export default function StudyScreen({ cards, direction, onAnswer, onSaveNote, onNavigate }) {
  const [flipped, setFlipped]               = useState(false)
  const [noteOpen, setNoteOpen]             = useState(false)
  const [noteText, setNoteText]             = useState('')
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal]     = useState(0)
  const [animating, setAnimating]           = useState(false)

  // Snapshot of what's on the card right now — frozen at answer time
  // so live card updates from useCards don't bleed through mid-animation.
  const [snapshot, setSnapshot] = useState(null)

  const advanceTimer = useRef(null)

  const queue = useMemo(() => buildQueue(cards, direction), [cards, direction])
  const now = Date.now()
  const dueQueue = useMemo(() => {
    return queue.filter(c => new Date(c.next_due || 0).getTime() <= now)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  // The live card from the queue — used to seed the snapshot when idle
  const liveCard = dueQueue[0] ?? null

  // Keep snapshot up to date with live data, but only when not animating
  useEffect(() => {
    if (!animating) {
      setSnapshot(liveCard ? { ...liveCard } : null)
    }
  // We intentionally exclude animating from deps so this only runs
  // when the card or queue changes while we're not mid-flip.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCard?.id, direction, animating])

  const handleAnswer = (correct) => {
    if (!snapshot || animating) return

    setSessionCorrect(s => s + (correct ? 1 : 0))
    setSessionTotal(s => s + 1)

    // Start flip-back — snapshot stays frozen until timer fires
    setFlipped(false)
    setNoteOpen(false)
    setAnimating(true)

    // Fire DB update immediately (non-blocking)
    onAnswer(snapshot.id, correct)

    advanceTimer.current = setTimeout(() => {
      setAnimating(false)
      // snapshot will refresh via the useEffect above once animating=false
    }, FLIP_MS + 50)
  }

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const handleFlip = () => {
    if (noteOpen || animating) return
    setFlipped(f => !f)
  }

  const handleNoteToggle = (e) => {
    e.stopPropagation()
    if (!snapshot) return
    if (!noteOpen) setNoteText(snapshot.note || '')
    setNoteOpen(o => !o)
  }

  const handleNoteSave = async (e) => {
    e.stopPropagation()
    if (snapshot) await onSaveNote(snapshot.id, noteText)
    setNoteOpen(false)
  }

  const pct = sessionTotal > 0 ? Math.round(sessionCorrect / sessionTotal * 100) : null
  const progressPct = sessionTotal / Math.max(sessionTotal + dueQueue.length, 1) * 100

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">🇸🇪</div>
        <div className="empty-title">No words yet</div>
        <p style={{ fontSize: '14px' }}>Add your first words to start studying.</p>
        <button className="btn-primary" onClick={() => onNavigate('import')}>Add words</button>
      </div>
    )
  }

  if (!snapshot && !animating && dueQueue.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">✅</div>
        <div className="empty-title">All caught up!</div>
        <p style={{ fontSize: '14px' }}>No cards due right now. Come back later or add more words.</p>
        {pct !== null && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Session: {sessionCorrect}/{sessionTotal} correct ({pct}%)
          </p>
        )}
        <button className="btn-primary" onClick={() => onNavigate('import')}>Add words</button>
      </div>
    )
  }

  const card      = snapshot
  const front     = card ? (card.showSv ? card.sv : card.en) : ''
  const back      = card ? (card.showSv ? card.en : card.sv) : ''
  const frontLang = card ? (card.showSv ? 'Svenska' : 'English') : ''
  const backLang  = card ? (card.showSv ? 'English' : 'Svenska') : ''
  const hasNote   = !!(card?.note?.trim())

  return (
    <div className="study-layout">
      {/* Progress bar */}
      <div className="progress-bar-wrap">
        <div className="progress-label">
          <span>{dueQueue.length} remaining</span>
          {pct !== null ? <span>{pct}% this session</span> : <span />}
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className={`card-scene${flipped ? ' flipped' : ''}`} onClick={handleFlip}>
        <div className="card-inner">
          <div className="card-face front">
            {card && <button className={`card-note-btn${hasNote ? ' has-note' : ''}`} onClick={handleNoteToggle} title={hasNote ? 'View note' : 'Add note'}>📝</button>}
            <div className="card-stats">
              <div className="stat-pill">✓ {card?.correct ?? 0}</div>
              <div className="stat-pill">✗ {card?.wrong ?? 0}</div>
            </div>
            <div className="card-lang">{frontLang}</div>
            <div className="card-word">{front}</div>
            {card && <div className="card-tap-hint">tap to reveal</div>}
          </div>
          <div className="card-face back">
            {card && <button className={`card-note-btn${hasNote ? ' has-note' : ''}`} onClick={handleNoteToggle} title={hasNote ? 'View note' : 'Add note'}>📝</button>}
            <div className="card-lang">{backLang}</div>
            <div className="card-word">{back}</div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(12px, 2.5vw, 15px)',
              opacity: 0.35,
              marginTop: '4px',
              textAlign: 'center',
            }}>{front}</div>
          </div>
        </div>
      </div>

      {/* Note panel */}
      {noteOpen && (
        <div className="note-panel">
          <div className="note-panel-header">
            <span className="note-panel-title">📝 Notes</span>
            <button className="note-close-btn" onClick={handleNoteToggle}>✕</button>
          </div>
          <textarea
            className="note-textarea"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Grammar notes, example sentences, memory tricks…"
            autoFocus
          />
          <button className="note-save-btn" onClick={handleNoteSave}>Save note</button>
        </div>
      )}

      {/* Answer buttons */}
      <div className="answer-buttons" style={{ visibility: flipped && !noteOpen && !animating ? 'visible' : 'hidden' }}>
        <button className="answer-btn btn-wrong" onClick={() => handleAnswer(false)}>
          <span className="btn-emoji">✗</span>
          <span className="btn-label">Didn't know</span>
        </button>
        <button className="answer-btn btn-right" onClick={() => handleAnswer(true)}>
          <span className="btn-emoji">✓</span>
          <span className="btn-label">Got it</span>
        </button>
      </div>
      <div className="answer-note" style={{ visibility: flipped && !noteOpen && !animating ? 'visible' : 'hidden' }}>
        Be honest — it helps the algorithm!
      </div>
    </div>
  )
}
