import { useState } from 'react'
import { Modal } from '../components.jsx'
import { IconCheck, IconAlert } from '../icons.jsx'

export default function Account({ store, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (next.length < 6) return setError('New password must be at least 6 characters')
    if (next !== confirm) return setError('New password and confirmation do not match')
    setBusy(true)
    try {
      await store.changePassword(current, next)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) { setError(err.message || 'Could not change password') }
    finally { setBusy(false) }
  }

  return (
    <Modal title="My Account" sub={`${store.user?.name} · ${store.user?.role}`} onClose={onClose}>
      <form className="grid" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field"><label>Current password</label>
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus autoComplete="current-password" /></div>
        <div className="field"><label>New password</label>
          <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
        <div className="field"><label>Confirm new password</label>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>

        {error && (
          <div className="insight" style={{ borderColor: 'var(--red)', padding: '10px 12px' }}>
            <span className="insight-ico" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><IconAlert /></span>
            <span style={{ alignSelf: 'center', fontSize: 13 }}>{error}</span>
          </div>
        )}
        {done && (
          <div className="insight" style={{ borderColor: 'var(--green)', padding: '10px 12px' }}>
            <span className="insight-ico" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><IconCheck /></span>
            <span style={{ alignSelf: 'center', fontSize: 13 }}>Password updated.</span>
          </div>
        )}
        <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </div>
      </form>
    </Modal>
  )
}
