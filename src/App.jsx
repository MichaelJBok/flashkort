import { useState } from 'react'
import { useAuth }  from './hooks/useAuth'
import { useCards } from './hooks/useCards'
import AuthScreen   from './screens/AuthScreen'
import StudyScreen  from './screens/StudyScreen'
import ImportScreen from './screens/ImportScreen'
import WordsScreen  from './screens/WordsScreen'
import StatsScreen  from './screens/StatsScreen'

const NAV = [
  { id: 'study',  icon: '📖', label: 'Study' },
  { id: 'import', icon: '➕', label: 'Add' },
  { id: 'words',  icon: '📋', label: 'Words' },
  { id: 'stats',  icon: '📊', label: 'Progress' },
]

export default function App() {
  const { session, user, loading: authLoading, sendMagicLink, sendingLink, linkSent, authError, signOut } = useAuth()
  const { cards, loading: cardsLoading, answerCard, saveNote, editCard, deleteCard, importPairs, reload } = useCards(user?.id)

  const [screen, setScreen]       = useState('study')
  const [direction, setDirection] = useState('both')

  // ── Auth loading splash ──────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-muted)', fontSize: '18px' }}>Svenska…</div>
      </div>
    )
  }

  // ── Not signed in ────────────────────────────────────
  if (!session) {
    return <AuthScreen sendMagicLink={sendMagicLink} sendingLink={sendingLink} linkSent={linkSent} authError={authError} />
  }

  // ── Reset all progress ───────────────────────────────
  const handleResetProgress = async () => {
    const { supabase } = await import('./lib/supabase')
    await supabase.from('progress').delete().eq('user_id', user.id)
    reload()
  }

  // ── Shuffle: jitter next_due on all cards ────────────
  const handleShuffle = async () => {
    const { supabase } = await import('./lib/supabase')
    // We can't do a bulk jitter update cleanly without a function,
    // so we just reload — effective enough since the queue re-sorts on each render
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <header>
        <div className="logo">Svenska <span>flashkort</span></div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleShuffle} title="Refresh queue">🔀</button>
          <button className="icon-btn" onClick={signOut} title="Sign out">↩</button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {cardsLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>
          </div>
        ) : (
          <>
            {screen === 'study' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '20px', flexDirection: 'column' }}>
                <StudyScreen
                  cards={cards}
                  direction={direction}
                  onAnswer={answerCard}
                  onSaveNote={saveNote}
                  onNavigate={setScreen}
                />
              </div>
            )}
            {screen === 'import' && (
              <ImportScreen
                onImport={importPairs}
                direction={direction}
                onDirectionChange={setDirection}
              />
            )}
            {screen === 'words' && (
              <WordsScreen
                cards={cards}
                onEdit={editCard}
                onDelete={deleteCard}
                onSaveNote={saveNote}
              />
            )}
            {screen === 'stats' && (
              <StatsScreen
                cards={cards}
                onResetProgress={handleResetProgress}
              />
            )}
          </>
        )}
      </main>

      {/* Nav */}
      <nav>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-btn${screen === n.id ? ' active' : ''}`}
            onClick={() => setScreen(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
