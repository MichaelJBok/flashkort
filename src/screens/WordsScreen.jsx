import { useState } from 'react'
import { getStatus } from '../lib/srs'
import EditModal from '../components/EditModal'

export default function WordsScreen({ cards, onEdit, onDelete, onSaveNote }) {
  const [filter, setFilter]   = useState('all')
  const [sort, setSort]       = useState('alpha')
  const [search, setSearch]   = useState('')
  const [editCard, setEditCard] = useState(null)

  const filtered = cards
    .filter(c => {
      if (filter !== 'all' && getStatus(c.interval) !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return c.sv.includes(q) || c.en.includes(q) || (c.note || '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'alpha')    return a.sv.localeCompare(b.sv)
      if (sort === 'hardest')  return (a.correct - a.wrong) - (b.correct - b.wrong)
      if (sort === 'easiest')  return (b.correct - b.wrong) - (a.correct - a.wrong)
      if (sort === 'newest')   return new Date(b.last_seen || 0) - new Date(a.last_seen || 0)
      if (sort === 'mostSeen') return (b.correct + b.wrong) - (a.correct + a.wrong)
      return 0
    })

  const chips = ['all', 'new', 'learning', 'good', 'known']

  const handleDelete = (card) => {
    if (window.confirm(`Delete "${card.sv} / ${card.en}"? This cannot be undone.`)) {
      onDelete(card.id)
    }
  }

  return (
    <div className="screen-scroll">
      <div className="screen-title">Word list</div>

      <div className="words-controls">
        <input
          className="search-input"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="alpha">A–Z</option>
          <option value="hardest">Hardest first</option>
          <option value="easiest">Easiest first</option>
          <option value="mostSeen">Most seen</option>
          <option value="newest">Recently seen</option>
        </select>
      </div>

      <div className="filter-chips">
        {chips.map(f => {
          const count = f === 'all' ? cards.length : cards.filter(c => getStatus(c.interval) === f).length
          return (
            <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="words-count">{filtered.length} of {cards.length} words</div>

      <div className="words-table">
        <div className="words-table-header">
          <span>Swedish</span>
          <span>English</span>
          <span title="Correct">✓</span>
          <span title="Wrong">✗</span>
          <span>Status</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No words match.
          </div>
        ) : (
          filtered.map(c => {
            const status = getStatus(c.interval)
            const hasNote = !!(c.note && c.note.trim())
            return (
              <div key={c.id} className="word-row-full">
                <div className="wrf-sv">
                  {c.sv}
                  {hasNote && <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: '4px' }} title={c.note}>📝</span>}
                </div>
                <div className="wrf-en">{c.en}</div>
                <div className="wrf-num wrf-correct">{c.correct}</div>
                <div className="wrf-num wrf-wrong">{c.wrong}</div>
                <div className="wrf-badge">
                  <span className={`score-badge score-${status}`}>{status}</span>
                </div>
                <div className="wrf-actions">
                  <button className="row-btn" onClick={() => setEditCard(c)} title="Edit">✏️</button>
                  <button className="row-btn del" onClick={() => handleDelete(c)} title="Delete">🗑</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {editCard && (
        <EditModal
          card={editCard}
          onSave={async (updates) => {
            const { error } = await onEdit(editCard.id, updates)
            if (!error) setEditCard(null)
            return { error }
          }}
          onClose={() => setEditCard(null)}
        />
      )}
    </div>
  )
}
