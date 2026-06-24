import { useState } from 'react'
import { statusBadge } from '../store.js'
import { Badge, TablePanel, Modal } from '../components.jsx'
import { IconPlus } from '../icons.jsx'

/** Reusable CRUD list for Expenditure Types and Departments. */
export default function ManageList({ title, nameLabel, rows, onAdd, onUpdate, onToggle, canEdit }) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null) // record being renamed, or null for add
  const [name, setName] = useState('')

  const openAdd = () => { setEditing(null); setName(''); setShow(true) }
  const openEdit = (r) => { setEditing(r); setName(r.name); setShow(true) }

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) await onUpdate(editing.id, name.trim())
    else await onAdd(name.trim())
    setShow(false)
  }

  const cols = [
    { key: 'no', label: 'No' },
    { key: 'name', label: nameLabel, render: (r) => <strong>{r.name}</strong> },
    { key: 'status', label: 'Status', render: (r) => <Badge kind={statusBadge(r.status)}>{r.status}</Badge> },
  ]
  if (canEdit) cols.push({
    key: 'act', label: 'Action', render: (r) => (
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => openEdit(r)}>Rename</button>
        <button className="icon-btn" onClick={() => onToggle(r.id)}>{r.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
      </div>
    ),
  })

  return (
    <>
      <TablePanel
        title={title}
        subtitle={`${rows.length} entries`}
        rows={rows.map((r, i) => ({ ...r, no: i + 1 }))}
        searchKeys={['name', 'status']}
        actions={canEdit && <button className="btn btn-primary btn-sm" onClick={openAdd}><IconPlus /> Add</button>}
        columns={cols}
      />
      {show && (
        <Modal title={editing ? `Rename ${nameLabel}` : `Add ${nameLabel}`} onClose={() => setShow(false)}>
          <form className="grid" style={{ gap: 14 }} onSubmit={save}>
            <div className="field"><label>{nameLabel} *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
