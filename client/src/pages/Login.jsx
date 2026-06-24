import { useState } from 'react'
import { IconAlert } from '../icons.jsx'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try { await onLogin(username.trim(), password) }
    catch (err) { setError(err.message || 'Login failed') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20,
      background: 'radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,.12), transparent), var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="brand-logo" style={{ width: 52, height: 52, margin: '0 auto 12px', fontSize: 17 }}>FLC</div>
          <h2 style={{ margin: 0, fontSize: 19, color: 'var(--navy)' }}>FLC Budget Tracker</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Sign in to continue</p>
        </div>
        <form className="grid" style={{ gap: 14 }} onSubmit={submit}>
          <div className="field"><label>Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" /></div>
          <div className="field"><label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
          {error && (
            <div className="insight" style={{ borderColor: 'var(--red)', padding: '10px 12px' }}>
              <span className="insight-ico" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><IconAlert /></span>
              <span style={{ alignSelf: 'center', fontSize: 13 }}>{error}</span>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          Demo accounts (password <code>flc1234</code>):<br />
          <strong>Admin</strong> — full access · <strong>user</strong> — view only
        </p>
      </div>
    </div>
  )
}
