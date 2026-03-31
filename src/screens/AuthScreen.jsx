import { useState } from 'react'

export default function AuthScreen({ sendMagicLink, sendingLink, linkSent, authError }) {
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email.trim()) sendMagicLink(email.trim())
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '32px 24px', gap: '32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          Svenska
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '16px', color: 'var(--text-muted)', marginTop: '4px' }}>
          flashkort
        </div>
      </div>

      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', padding: '28px 24px',
        width: '100%', maxWidth: '380px',
        boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {!linkSent ? (
          <>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', marginBottom: '4px' }}>Sign in</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Enter your email to receive a magic link.</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                style={{
                  width: '100%', border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', fontFamily: 'var(--font-sans)', fontSize: '15px',
                  color: 'var(--text)', background: 'var(--bg)', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              {authError && (
                <div style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>
                  {authError === 'Signups not allowed for this instance'
                    ? 'This email isn\'t registered. Ask an admin to add you.'
                    : authError}
                </div>
              )}
              <button
                type="submit"
                disabled={sendingLink || !email.trim()}
                style={{
                  background: sendingLink ? 'var(--text-muted)' : 'var(--accent)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  padding: '13px', fontFamily: 'var(--font-sans)', fontSize: '15px',
                  fontWeight: '500', cursor: sendingLink ? 'default' : 'pointer',
                }}
              >
                {sendingLink ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            <div style={{ fontSize: '40px' }}>📬</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px' }}>Check your email</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              We sent a sign-in link to <strong>{email}</strong>. Click it to continue — it expires in 1 hour.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
