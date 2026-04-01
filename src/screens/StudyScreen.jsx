import { useState, useMemo, useEffect, useRef } from 'react'
import { buildQueue } from '../lib/srs'

const FLIP_MS = 500

// ── Utility ──────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDecoys(allCards, correctCard, showSv, count = 4) {
  const pool = allCards.filter(c => c.id !== correctCard.id)
  return shuffle(pool).slice(0, count).map(c => showSv ? c.en : c.sv)
}

// ─────────────────────────────────────────────────────────
//  FLASHCARD MODE
// ─────────────────────────────────────────────────────────
function FlashcardMode({ cards, direction, onAnswer, onSaveNote, onNavigate }) {
  const [flipped, setFlipped]               = useState(false)
  const [noteOpen, setNoteOpen]             = useState(false)
  const [noteText, setNoteText]             = useState('')
  const [animating, setAnimating]           = useState(false)
  const [snapshot, setSnapshot]             = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal]     = useState(0)

  // Hint state
  const [hintOptions, setHintOptions]   = useState(null)   // null | string[]
  const [hintPicked, setHintPicked]     = useState(null)   // null | string
  const [hintCorrect, setHintCorrect]   = useState(null)   // null | bool
  const [usedHint, setUsedHint]         = useState(false)

  const advanceTimer = useRef(null)

  const queue    = useMemo(() => buildQueue(cards, direction), [cards, direction])
  const now      = Date.now()
  const dueQueue = useMemo(() => queue.filter(c => new Date(c.next_due || 0).getTime() <= now), [queue])
  const liveCard = dueQueue[0] ?? null

  useEffect(() => {
    if (!animating) setSnapshot(liveCard ? { ...liveCard } : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCard?.id, direction, animating])

  const resetHint = () => { setHintOptions(null); setHintPicked(null); setHintCorrect(null); setUsedHint(false) }

  const handleAnswer = (correct, mode = 'normal') => {
    if (!snapshot || animating) return
    setSessionCorrect(s => s + (correct ? 1 : 0))
    setSessionTotal(s => s + 1)
    setFlipped(false)
    setNoteOpen(false)
    setAnimating(true)
    resetHint()
    onAnswer(snapshot.id, correct, mode)
    advanceTimer.current = setTimeout(() => setAnimating(false), FLIP_MS + 50)
  }

  const handleFlip = () => {
    if (noteOpen || animating || hintOptions) return
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

  const handleShowHint = (e) => {
    e.stopPropagation()
    if (!snapshot || hintOptions) return
    const correctAnswer = snapshot.showSv ? snapshot.en : snapshot.sv
    const decoys = pickDecoys(cards, snapshot, snapshot.showSv)
    setHintOptions(shuffle([correctAnswer, ...decoys]))
    setUsedHint(true)
  }

  const handleHintPick = (option) => {
    if (hintPicked) return
    const correctAnswer = snapshot.showSv ? snapshot.en : snapshot.sv
    const isCorrect = option === correctAnswer
    setHintPicked(option)
    setHintCorrect(isCorrect)
    // After a short pause, flip card and proceed
    setTimeout(() => {
      setFlipped(true)
      setTimeout(() => {
        handleAnswer(isCorrect, isCorrect ? 'hint' : 'normal')
      }, 800)
    }, 600)
  }

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const pct = sessionTotal > 0 ? Math.round(sessionCorrect / sessionTotal * 100) : null
  const progressPct = sessionTotal / Math.max(sessionTotal + dueQueue.length, 1) * 100

  if (cards.length === 0) return (
    <div className="empty-state">
      <div className="emoji">🇸🇪</div>
      <div className="empty-title">No words yet</div>
      <p style={{ fontSize: '14px' }}>Add your first words to start studying.</p>
      <button className="btn-primary" onClick={() => onNavigate('import')}>Add words</button>
    </div>
  )

  if (!snapshot && !animating && dueQueue.length === 0) return (
    <div className="empty-state">
      <div className="emoji">✅</div>
      <div className="empty-title">All caught up!</div>
      <p style={{ fontSize: '14px' }}>No cards due right now.</p>
      {pct !== null && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Session: {sessionCorrect}/{sessionTotal} ({pct}%)</p>}
      <button className="btn-primary" onClick={() => onNavigate('import')}>Add words</button>
    </div>
  )

  const card      = snapshot
  const front     = card ? (card.showSv ? card.sv : card.en) : ''
  const back      = card ? (card.showSv ? card.en : card.sv) : ''
  const frontLang = card ? (card.showSv ? 'Svenska' : 'English') : ''
  const backLang  = card ? (card.showSv ? 'English' : 'Svenska') : ''
  const hasNote   = !!(card?.note?.trim())
  const showAnswerBtns = flipped && !noteOpen && !animating && !hintOptions

  return (
    <div className="study-layout">
      <div className="progress-bar-wrap">
        <div className="progress-label">
          <span>{dueQueue.length} remaining</span>
          {pct !== null ? <span>{pct}% this session</span> : <span />}
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
      </div>

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
            {card && !hintOptions && <div className="card-tap-hint">tap to reveal</div>}
          </div>
          <div className="card-face back">
            {card && <button className={`card-note-btn${hasNote ? ' has-note' : ''}`} onClick={handleNoteToggle} title={hasNote ? 'View note' : 'Add note'}>📝</button>}
            <div className="card-lang">{backLang}</div>
            <div className="card-word">{back}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(12px,2.5vw,15px)', opacity: 0.35, marginTop: '4px', textAlign: 'center' }}>{front}</div>
          </div>
        </div>
      </div>

      {/* Hint options */}
      {hintOptions && !flipped && (
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>
            Which is the correct translation?
          </div>
          {hintOptions.map((opt, i) => {
            const correctAnswer = card.showSv ? card.en : card.sv
            const isCorrect = opt === correctAnswer
            const isPicked  = opt === hintPicked
            let bg = 'var(--surface)', border = 'var(--border)', color = 'var(--text)'
            if (isPicked && hintCorrect)  { bg = 'var(--green-light)';  border = 'var(--green)';  color = 'var(--green)' }
            if (isPicked && !hintCorrect) { bg = 'var(--red-light)';    border = 'var(--red)';    color = 'var(--red)' }
            if (hintPicked && !isPicked && isCorrect) { bg = 'var(--green-light)'; border = 'var(--green)'; color = 'var(--green)' }
            return (
              <button key={i} onClick={() => handleHintPick(opt)} disabled={!!hintPicked}
                style={{
                  padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${border}`,
                  background: bg, color, fontFamily: 'var(--font-serif)', fontSize: '15px',
                  cursor: hintPicked ? 'default' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  width: '100%',
                }}>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Hint button — only shown when card is unflipped and hint not yet shown */}
      {card && !flipped && !hintOptions && !animating && (
        <button onClick={handleShowHint}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '7px 16px', fontSize: '13px', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
          💡 Show hint
          {usedHint && <span style={{ fontSize: '10px', color: 'var(--amber)', fontWeight: 600 }}>−½ credit</span>}
        </button>
      )}

      {/* Note panel */}
      {noteOpen && (
        <div className="note-panel">
          <div className="note-panel-header">
            <span className="note-panel-title">📝 Notes</span>
            <button className="note-close-btn" onClick={handleNoteToggle}>✕</button>
          </div>
          <textarea className="note-textarea" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Grammar notes, example sentences, memory tricks…" autoFocus />
          <button className="note-save-btn" onClick={handleNoteSave}>Save note</button>
        </div>
      )}

      <div className="answer-buttons" style={{ visibility: showAnswerBtns ? 'visible' : 'hidden' }}>
        <button className="answer-btn btn-wrong" onClick={() => handleAnswer(false)}>
          <span className="btn-emoji">✗</span><span className="btn-label">Didn't know</span>
        </button>
        <button className="answer-btn btn-right" onClick={() => handleAnswer(true)}>
          <span className="btn-emoji">✓</span><span className="btn-label">Got it</span>
        </button>
      </div>
      <div className="answer-note" style={{ visibility: showAnswerBtns ? 'visible' : 'hidden' }}>
        Be honest — it helps the algorithm!
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  MATCH MODE
// ─────────────────────────────────────────────────────────
const ROUND_SIZE = 5

function MatchMode({ cards, direction, onAnswer, onNavigate }) {
  const [round, setRound]           = useState(() => makeRound(cards, direction))
  const [selectedSv, setSelectedSv] = useState(null)  // index into svCol
  const [selectedEn, setSelectedEn] = useState(null)  // index into enCol
  const [matched, setMatched]       = useState(new Set())   // matched sv-side indices
  const [wrong, setWrong]           = useState(new Set())   // briefly flash wrong
  const [score, setScore]           = useState({ correct: 0, total: 0 })
  const [complete, setComplete]     = useState(false)
  const wrongTimer = useRef(null)

  function makeRound(allCards, dir) {
    if (allCards.length < 2) return null
    // Prefer due cards, fill with others if needed
    const now = Date.now()
    const due  = allCards.filter(c => new Date(c.next_due || 0).getTime() <= now)
    const rest = allCards.filter(c => new Date(c.next_due || 0).getTime() >  now)
    const pool = shuffle([...due, ...rest]).slice(0, ROUND_SIZE)
    // For each card decide which side is the "question"
    const showSv = dir === 'en-sv' ? false : true  // 'both' defaults to sv side
    const svCol  = pool.map(c => ({ id: c.id, text: showSv ? c.sv : c.en, card: c }))
    const enCol  = shuffle(pool.map(c => ({ id: c.id, text: showSv ? c.en : c.sv, card: c })))
    return { svCol, enCol, showSv }
  }

  const tryMatch = (svIdx, enIdx) => {
    if (!round) return
    const svItem = round.svCol[svIdx]
    const enItem = round.enCol[enIdx]
    if (svItem.id === enItem.id) {
      // Correct
      const newMatched = new Set(matched)
      newMatched.add(svIdx)
      setMatched(newMatched)
      setSelectedSv(null)
      setSelectedEn(null)
      onAnswer(svItem.id, true, 'normal')
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }))
      if (newMatched.size === round.svCol.length) {
        setTimeout(() => setComplete(true), 400)
      }
    } else {
      // Wrong — flash red then deselect
      setWrong(new Set([svIdx]))
      setScore(s => ({ ...s, total: s.total + 1 }))
      clearTimeout(wrongTimer.current)
      wrongTimer.current = setTimeout(() => {
        setWrong(new Set())
        setSelectedSv(null)
        setSelectedEn(null)
      }, 700)
    }
  }

  const handleSvTap = (i) => {
    if (matched.has(i) || wrong.has(i)) return
    const newSv = selectedSv === i ? null : i
    setSelectedSv(newSv)
    if (newSv !== null && selectedEn !== null) tryMatch(newSv, selectedEn)
  }

  const handleEnTap = (i) => {
    // Find if this en card is already matched
    if (!round) return
    const enItem = round.enCol[i]
    const svIdx  = round.svCol.findIndex(s => s.id === enItem.id)
    if (matched.has(svIdx)) return
    const newEn = selectedEn === i ? null : i
    setSelectedEn(newEn)
    if (selectedSv !== null && newEn !== null) tryMatch(selectedSv, newEn)
  }

  const handleNextRound = () => {
    setRound(makeRound(cards, direction))
    setSelectedSv(null); setSelectedEn(null)
    setMatched(new Set()); setWrong(new Set())
    setComplete(false)
  }

  useEffect(() => () => clearTimeout(wrongTimer.current), [])

  if (cards.length < 2) return (
    <div className="empty-state">
      <div className="emoji">🃏</div>
      <div className="empty-title">Need more words</div>
      <p style={{ fontSize: '14px' }}>Add at least 2 words to use Match mode.</p>
      <button className="btn-primary" onClick={() => onNavigate('import')}>Add words</button>
    </div>
  )

  if (!round) return null

  if (complete) {
    const pct = Math.round(score.correct / score.total * 100)
    return (
      <div className="empty-state">
        <div className="emoji">{pct === 100 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
        <div className="empty-title">Round complete!</div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{score.correct}/{score.total} matched correctly</p>
        <button className="btn-primary" onClick={handleNextRound}>Next round</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Tap a word on each side to match them
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Swedish column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {round.svCol.map((item, i) => {
            const isMatched  = matched.has(i)
            const isSelected = selectedSv === i
            const isWrong    = wrong.has(i)
            return (
              <button key={i} onClick={() => handleSvTap(i)}
                style={{
                  padding: '14px 12px', borderRadius: '12px', textAlign: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: 1.3,
                  cursor: isMatched ? 'default' : 'pointer',
                  border: `2px solid ${isMatched ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isMatched ? 'var(--green-light)' : isWrong ? 'var(--red-light)' : isSelected ? 'var(--accent-light)' : 'var(--surface)',
                  color: isMatched ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text)',
                  transition: 'all 0.15s',
                  opacity: isMatched ? 0.6 : 1,
                  minHeight: '52px',
                }}>
                {item.text}
              </button>
            )
          })}
        </div>
        {/* English column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {round.enCol.map((item, i) => {
            const svIdx      = round.svCol.findIndex(s => s.id === item.id)
            const isMatched  = matched.has(svIdx)
            const isSelected = selectedEn === i
            const isWrong    = wrong.has(svIdx)
            return (
              <button key={i} onClick={() => handleEnTap(i)}
                style={{
                  padding: '14px 12px', borderRadius: '12px', textAlign: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.3,
                  cursor: isMatched ? 'default' : 'pointer',
                  border: `2px solid ${isMatched ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isMatched ? 'var(--green-light)' : isWrong ? 'var(--red-light)' : isSelected ? 'var(--accent-light)' : 'var(--surface)',
                  color: isMatched ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                  opacity: isMatched ? 0.6 : 1,
                  minHeight: '52px',
                }}>
                {item.text}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        {matched.size}/{round.svCol.length} matched
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  ROOT STUDY SCREEN
// ─────────────────────────────────────────────────────────
export default function StudyScreen({ cards, direction, onAnswer, onSaveNote, onNavigate }) {
  const [mode, setMode] = useState('flashcard') // 'flashcard' | 'match'

  return (
    <div className="study-layout" style={{ paddingTop: '8px' }}>
      {/* Mode toggle */}
      <div style={{
        display: 'flex', background: 'var(--surface2)', borderRadius: '12px',
        padding: '3px', gap: '2px', width: '100%', maxWidth: '420px',
      }}>
        {[{ id: 'flashcard', label: '🃏 Flashcards' }, { id: 'match', label: '🔗 Match' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: '8px', borderRadius: '9px', border: 'none',
              fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m.id ? 'var(--surface)' : 'transparent',
              color: mode === m.id ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: mode === m.id ? 'var(--shadow)' : 'none',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'flashcard'
        ? <FlashcardMode cards={cards} direction={direction} onAnswer={onAnswer} onSaveNote={onSaveNote} onNavigate={onNavigate} />
        : <MatchMode     cards={cards} direction={direction} onAnswer={onAnswer} onNavigate={onNavigate} />
      }
    </div>
  )
}
