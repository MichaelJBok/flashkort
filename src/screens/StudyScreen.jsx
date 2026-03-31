import { useState, useMemo } from 'react'
import { buildQueue, getStatus } from '../lib/srs'

export default function StudyScreen({ cards, direction, onAnswer, onSaveNote, onNavigate }) {
  const [flipped, setFlipped]       = useState(false)
  const [noteOpen, setNoteOpen]     = useState(false)
  const [noteText, setNoteText]     = useState('')
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal]     = useState(0)
  const [currentIdx, setCurrentIdx] = useState(0)

  const queue = useMemo(() => buildQueue(cards, direction), [cards, direction])

  // Advance to next card and reset state
  const advance = () => {
    setFlipped(false)
    setNoteOpen(false)
    setCurrentIdx(i => i + 1)
  }

  const handleAnswer = async (correct) => {
    if (!currentCard) return
    setSessionCorrect(s => s + (correct ? 1 : 0))
    setSessionTotal(s => s + 1)
    await onAnswer(currentCard.id, correct)
    advance()
  }

  const handleFlip = () => {
    if (noteOpen) return
    setFlipped(f => !f)
  }

  const handleNoteToggle = (e) => {
    e.stopPropagation()
    if (!noteOpen) setNoteText(currentCard?.note || '')
    setNoteOpen(o => !o)
  }

  const handleNoteSave = async (e) => {
    e.stopPropagation()
    if (currentCard) await onSaveNote(currentCard.id, noteText)
    setNoteOpen(false)
  }

  const now = Date.now()
  const dueQueue = queue.filter(c => new Date(c.next_due || 0).getTime() <= now)

  // We track position in the full queue; skip already-answered ones
  const currentCard = dueQueue[0] ?? null

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

  if (!currentCard) {
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

  const front     = currentCard.showSv ? currentCard.sv : currentCard.en
  const back      = currentCard.showSv ? currentCard.en : currentCard.sv
  const frontLang = currentCard.showSv ? 'Svenska' : 'English'
  const backLang  = currentCard.showSv ? 'English' : 'Svenska'
  const hasNote   = !!(currentCard.note && currentCard.note.trim())

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
          {/* Front */}
          <div className="card-face front">
            <button className={`card-note-btn${hasNote ? ' has-note' : ''}`} onClick={handleNoteToggle} title={hasNote ? 'View note' : 'Add note'}>📝</button>
            <div className="card-stats">
              <div className="stat-pill">✓ {currentCard.correct}</div>
              <div className="stat-pill">✗ {currentCard.wrong}</div>
            </div>
            <div className="card-lang">{frontLang}</div>
            <div className="card-word">{front}</div>
            <div className="card-tap-hint">tap to reveal</div>
          </div>
          {/* Back */}
          <div className="card-face back">
            <button className={`card-note-btn${hasNote ? ' has-note' : ''}`} onClick={handleNoteToggle} title={hasNote ? 'View note' : 'Add note'}>📝</button>
            <div className="card-lang">{backLang}</div>
            <div className="card-word">{back}</div>
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
      <div className="answer-buttons" style={{ visibility: flipped && !noteOpen ? 'visible' : 'hidden' }}>
        <button className="answer-btn btn-wrong" onClick={() => handleAnswer(false)}>
          <span className="btn-emoji">✗</span>
          <span className="btn-label">Didn't know</span>
        </button>
        <button className="answer-btn btn-right" onClick={() => handleAnswer(true)}>
          <span className="btn-emoji">✓</span>
          <span className="btn-label">Got it</span>
        </button>
      </div>
      <div className="answer-note" style={{ visibility: flipped && !noteOpen ? 'visible' : 'hidden' }}>
        Be honest — it helps the algorithm!
      </div>
    </div>
  )
}
