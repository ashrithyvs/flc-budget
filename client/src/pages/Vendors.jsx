import { useState, useMemo } from 'react'
import { fmt, statusBadge } from '../store.js'
import { Badge, TablePanel, Modal, FormError } from '../components.jsx'
import { IconPlus, IconTrash } from '../icons.jsx'

const BLANK = { name: '', contact: '', email: '', phone: '', status: 'Active' }

export default function Vendors({ store }) {
  const { vendors, contracts } = store.data
  const isAdmin = store.isAdmin
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState(null)

  const rows = useMemo(() => vendors.map((v) => {
    const cs = contracts.filter((c) => c.vendor.toLowerCase() === v.name.toLowerCase())
    const active = cs.filter((c) => c.status === 'Active')
    return { ...v, activeContracts: active.length, totalValue: active.reduce((s, c) => s + c.amount, 0) }
  }), [vendors, contracts])

  const openAdd = () => { setEditing(null); setForm(BLANK); setError(null); setShow(true) }
  const openEdit = (v) => { setEditing(v); setForm({ name: v.name, contact: v.contact || '', email: v.email || '', phone: v.phone || '', status: v.status || 'Active' }); setError(null); setShow(true) }

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (editing) await store.updateVendor(editing.id, form)
      else await store.addVendor(form)
      setShow(false)
    } catch (err) { setError(err.message || 'Could not save vendor') }
  }

  const cols = [
    { key: 'name', label: 'Vendor Name', render: (v) => <strong style={{ color: 'var(--navy)' }}>{v.name}</strong> },
    { key: 'contact', label: 'Primary Contact', render: (v) => v.contact || <span className="muted">—</span> },
    { key: 'activeContracts', label: 'Active Contracts', align: 'right' },
    { key: 'totalValue', label: 'Total Value', align: 'right', render: (v) => fmt(v.totalValue) },
    { key: 'status', label: 'Status', render: (v) => <Badge kind={statusBadge(v.status)}>{v.status}</Badge> },
  ]
  if (isAdmin) cols.push({
    key: 'act', label: 'Action', render: (v) => (
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => openEdit(v)}>Edit</button>
        <button className="icon-btn danger" onClick={() => confirm(`Delete vendor "${v.name}"?`) && store.deleteVendor(v.id)}><IconTrash /></button>
      </div>
    ),
  })

  return (
    <>
      <TablePanel
        title="Vendors List"
        subtitle={`${vendors.length} vendors`}
        rows={rows}
        searchKeys={['name', 'contact', 'email', 'status']}
        exportName="vendors.csv"
        exportRows={() => rows.map((v) => ({ Vendor: v.name, Contact: v.contact, Email: v.email, Phone: v.phone, 'Active Contracts': v.activeContracts, 'Total Value': v.totalValue, Status: v.status }))}
        actions={isAdmin && <button className="btn btn-primary btn-sm" onClick={openAdd}><IconPlus /> Add Vendor</button>}
        columns={cols}
      />

      {show && (
        <Modal title={editing ? 'Edit Vendor' : 'Add Vendor'} sub={editing ? 'Update this vendor record' : 'Create a new vendor record'} onClose={() => setShow(false)}>
          <form className="grid" style={{ gap: 14 }} onSubmit={save}>
            <div className="form-grid">
              <div className="field"><label>Vendor Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div className="field"><label>Primary Contact</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></div>
            </div>
            <FormError message={error} />
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Save Vendor'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
