import { getStatus } from '../lib/srs'

export default function StatsScreen({ cards, onResetProgress }) {
  const total = cards.length

  const handleReset = () => {
    if (window.confirm('Reset all progress? Words will be kept but scores cleared.')) {
      onResetProgress()
    }
  }

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="screen-title" style={{ marginBottom: 0 }}>Progress</div>
          <button onClick={handleReset} style={{ fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}>
            Reset progress
          </button>
        </div>
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <div className="emoji">📊</div>
          <div className="empty-title">No data yet</div>
          <p style={{ fontSize: '14px' }}>Start studying to see your progress.</p>
        </div>
      </div>
    )
  }

  const counts = { new: 0, learning: 0, good: 0, known: 0 }
  cards.forEach(c => counts[getStatus(c.interval)]++)

  const totalAnswers = cards.reduce((s, c) => s + c.correct + c.wrong, 0)
  const totalCorrect = cards.reduce((s, c) => s + c.correct, 0)
  const overallAcc   = totalAnswers > 0 ? Math.round(totalCorrect / totalAnswers * 100) : 0
  const avgInterval  = Math.round(cards.reduce((s, c) => s + (c.interval || 1), 0) / total)

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const seenToday  = cards.filter(c => c.last_seen && new Date(c.last_seen) >= todayStart).length

  const masteryPct = s => total > 0 ? Math.round(counts[s] / total * 100) : 0

  const hardest = cards
    .filter(c => c.correct + c.wrong >= 2)
    .sort((a, b) => (b.wrong / (b.correct + b.wrong)) - (a.wrong / (a.correct + a.wrong)))
    .slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* ── Sticky header with reset ── */}
      <div style={{
        padding: '12px 16px 10px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="screen-title" style={{ marginBottom: 0 }}>Progress</div>
        <button
          onClick={handleReset}
          style={{ fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}
        >
          Reset progress
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' , display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{total}</div>
            <div className="stat-label">Total words</div>
            <div className="stat-sub">{totalAnswers} answers logged</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--accent)' }}>{overallAcc}%</div>
            <div className="stat-label">Overall accuracy</div>
            <div className="stat-sub">{totalCorrect} correct of {totalAnswers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--green)' }}>{counts.known + counts.good}</div>
            <div className="stat-label">Confident words</div>
            <div className="stat-sub">{masteryPct('good') + masteryPct('known')}% of deck</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--amber)' }}>{seenToday}</div>
            <div className="stat-label">Reviewed today</div>
            <div className="stat-sub">avg interval ×{avgInterval}</div>
          </div>
        </div>

        <div className="section-title">Mastery breakdown</div>
        <div className="mastery-wrap">
          <div className="mastery-bar">
            <div className="mastery-seg" style={{ width: `${masteryPct('new')}%`,      background: 'var(--accent)' }} />
            <div className="mastery-seg" style={{ width: `${masteryPct('learning')}%`, background: 'var(--amber)' }} />
            <div className="mastery-seg" style={{ width: `${masteryPct('good')}%`,     background: 'var(--teal)' }} />
            <div className="mastery-seg" style={{ width: `${masteryPct('known')}%`,    background: 'var(--green)' }} />
          </div>
          <div className="mastery-legend">
            {[
              { label: 'New',      color: 'var(--accent)', key: 'new' },
              { label: 'Learning', color: 'var(--amber)',  key: 'learning' },
              { label: 'Good',     color: 'var(--teal)',   key: 'good' },
              { label: 'Known',    color: 'var(--green)',  key: 'known' },
            ].map(({ label, color, key }) => (
              <div key={key} className="legend-item">
                <div className="legend-dot" style={{ background: color }} />
                {label} — {counts[key]} ({masteryPct(key)}%)
              </div>
            ))}
          </div>
        </div>

        {hardest.length > 0 && (
          <>
            <div className="section-title">Trickiest words</div>
            <div className="hardest-list">
              <div className="hardest-header">
                <span style={{ flex: 1 }}>Swedish</span>
                <span style={{ flex: 1 }}>English</span>
                <span style={{ minWidth: '42px', textAlign: 'right' }}>Error %</span>
              </div>
              {hardest.map(c => {
                const t = c.correct + c.wrong
                const ep = Math.round(c.wrong / t * 100)
                return (
                  <div key={c.id} className="hardest-row">
                    <div className="hardest-sv">{c.sv}</div>
                    <div className="hardest-en">{c.en}</div>
                    <div className="hardest-rate" style={{ color: ep > 50 ? 'var(--red)' : 'var(--amber)' }}>
                      {ep}%
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
