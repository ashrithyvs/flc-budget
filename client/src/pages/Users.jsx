import { useState } from 'react'
import { statusBadge } from '../store.js'
import { Badge, TablePanel, Modal, FormError } from '../components.jsx'
import { IconPlus } from '../icons.jsx'

const BLANK = { name: '', email: '', username: '', phone: '', role: 'Viewer', status: 'Active', password: '' }

export default function Users({ store }) {
  const { users } = store.data
  const isAdmin = store.isAdmin
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState(null)

  const openAdd = () => { setEditing(null); setForm(BLANK); setError(null); setShow(true) }
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, username: u.username, phone: u.phone || '', role: u.role, status: u.status, password: '' }); setError(null); setShow(true) }

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    const body = { ...form }
    if (editing && !body.password) delete body.password // keep existing password if blank
    try {
      if (editing) await store.updateUser(editing.id, body)
      else await store.addUser(body)
      setShow(false)
    } catch (err) { setError(err.message || 'Could not save user') }
  }

  const cols = [
    { key: 'no', label: 'No' },
    { key: 'name', label: 'Name', render: (u) => <strong>{u.name}</strong> },
    { key: 'email', label: 'Email' },
    { key: 'username', label: 'Username' },
    { key: 'phone', label: 'Phone', render: (u) => <span className="muted">{u.phone}</span> },
    { key: 'role', label: 'Role', render: (u) => <Badge kind={u.role === 'Admin' ? 'b-blue' : 'b-gray'}>{u.role}</Badge> },
    { key: 'status', label: 'Status', render: (u) => <Badge kind={statusBadge(u.status)}>{u.status}</Badge> },
  ]
  if (isAdmin) cols.push({
    key: 'act', label: 'Action', render: (u) => (
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => openEdit(u)}>Edit</button>
        <button className="icon-btn" onClick={() => store.toggleUser(u.id)}>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
      </div>
    ),
  })

  return (
    <>
      <TablePanel
        title="List of Users"
        subtitle={`${users.length} users`}
        rows={users.map((u, i) => ({ ...u, no: i + 1 }))}
        searchKeys={['name', 'email', 'username', 'role', 'status']}
        actions={isAdmin && <button className="btn btn-primary btn-sm" onClick={openAdd}><IconPlus /> Add User</button>}
        columns={cols}
      />
      {show && (
        <Modal title={editing ? 'Edit User' : 'Add User'} sub={editing ? 'Update this user' : 'Create a new system user'} onClose={() => setShow(false)}>
          <form className="grid" style={{ gap: 14 }} onSubmit={save}>
            <div className="form-grid">
              <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div className="field"><label>Email *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Username</label><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>Role</label>
                <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>Viewer</option><option>Admin</option></select></div>
              <div className="field"><label>Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>{editing ? 'New Password (leave blank to keep current)' : 'Password (defaults to flc1234 if blank)'}</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
            </div>
            <FormError message={error} />
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Save User'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
