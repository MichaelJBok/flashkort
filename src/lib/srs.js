// ── Spaced Repetition Helpers ─────────────────────────────
// Pure functions — no Supabase dependency.
// Cards in memory are shaped as:
//   { id, sv, en, note, correct, wrong, interval, next_due, last_seen }

export function getStatus(interval = 1) {
  if (interval >= 16) return 'known'
  if (interval >= 4)  return 'good'
  if (interval >= 2)  return 'learning'
  return 'new'
}

/** Sort cards into study queue — due cards first, then by lowest interval */
export function buildQueue(cards, direction = 'both') {
  const now = Date.now()
  const entries = []

  cards.forEach(c => {
    if (direction === 'sv-en' || direction === 'both') entries.push({ ...c, showSv: true })
    if (direction === 'en-sv' || direction === 'both') entries.push({ ...c, showSv: false })
  })

  return entries.sort((a, b) => {
    const ad = new Date(a.next_due || 0).getTime() - now
    const bd = new Date(b.next_due || 0).getTime() - now
    if (ad <= 0 && bd <= 0) return (a.interval || 1) - (b.interval || 1)
    if (ad <= 0) return -1
    if (bd <= 0) return 1
    return ad - bd
  })
}

/**
 * Compute updated progress fields after an answer.
 * mode: 'normal' | 'hint' | 'wrong'
 *   normal → correct doubles interval, wrong resets to 1
 *   hint   → correct adds 1 (no doubling), wrong resets to 1
 */
export function computeAnswer(card, correct, mode = 'normal') {
  let interval
  if (!correct) {
    interval = 1
  } else if (mode === 'hint') {
    interval = Math.min((card.interval || 1) + 1, 32)
  } else {
    interval = Math.min((card.interval || 1) * 2, 32)
  }

  // Interval-based cooldown, loosely inspired by Anki:
  // 1→1min, 2→10min, 4→1hr, 8→8hr, 16→1day, 32→3days
  const INTERVAL_MINUTES = { 1: 1, 2: 10, 4: 60, 8: 480, 16: 1440, 32: 4320 }
  const minutes = INTERVAL_MINUTES[interval] ?? interval * 90
  const next_due = new Date(Date.now() + minutes * 60_000).toISOString()

  return {
    correct:   (card.correct || 0) + (correct ? 1 : 0),
    wrong:     (card.wrong   || 0) + (correct ? 0 : 1),
    interval,
    next_due,
    last_seen: new Date().toISOString(),
  }
}

/** Delimiter auto-detection for import */
export function detectDelimiter(lines) {
  const sample = lines.slice(0, 10).join('\n')
  if (/\t/.test(sample))  return { re: /\t+/,     name: 'tab' }
  if (/,/.test(sample))   return { re: /\s*,\s*/,  name: 'comma' }
  if (/ - /.test(sample)) return { re: /\s+-\s+/,  name: 'dash' }
  if (/  +/.test(sample)) return { re: /  +/,       name: 'spaces' }
  return null
}

/** Parse raw pasted text into [{sv, en}] pairs, also returning unparseable lines */
export function parsePaste(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const delim = detectDelimiter(lines)
  if (!delim) return { pairs: [], delimName: null, badLines: [] }

  const pairs = []
  const badLines = []
  lines.forEach(line => {
    const parts = line.split(delim.re).map(s => s.trim()).filter(Boolean)
    if (parts.length < 2) { badLines.push(line); return }
    const sv = parts[0].toLowerCase()
    const en = parts[1].toLowerCase()
    if (sv && en) pairs.push({ sv, en })
    else badLines.push(line)
  })

  return { pairs, delimName: delim.name, badLines }
}
