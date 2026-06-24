import { useState, useMemo } from 'react'
import { fmt, statusBadge } from '../store.js'
import { Badge, TablePanel, Modal, FormError } from '../components.jsx'
import { IconPlus, IconTrash, IconAlert } from '../icons.jsx'

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) } catch { return d } }
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000)
const yn = (b) => b ? <Badge kind="b-blue">Yes</Badge> : <span className="muted">No</span>
const BLANK = { vendor: '', contact: '', amount: '', start: '', end: '', gasb: false, autoRenew: false, multiYear: false, status: 'Active' }

export default function Contracts({ store }) {
  const { contracts, vendors } = store.data
  const isAdmin = store.isAdmin
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState(null)

  const expiringSoon = useMemo(() => contracts.filter((c) => c.status === 'Active' && daysUntil(c.end) >= 0 && daysUntil(c.end) <= 90).length, [contracts])
  const totalValue = contracts.filter((c) => c.status === 'Active').reduce((s, c) => s + c.amount, 0)

  const openAdd = () => { setEditing(null); setForm(BLANK); setError(null); setShow(true) }
  const openEdit = (c) => { setEditing(c); setForm({ vendor: c.vendor, contact: c.contact || '', amount: c.amount, start: c.start || '', end: c.end || '', gasb: !!c.gasb, autoRenew: !!c.autoRenew, multiYear: !!c.multiYear, status: c.status }); setError(null); setShow(true) }

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    const body = { ...form, amount: parseFloat(form.amount) || 0 }
    try {
      if (editing) await store.updateContract(editing.id, body)
      else await store.addContract(body)
      setShow(false)
    } catch (err) { setError(err.message || 'Could not save contract') }
  }

  const cols = [
    { key: 'vendor', label: 'Vendor', render: (c) => <strong style={{ color: 'var(--navy)' }}>{c.vendor}</strong> },
    { key: 'contact', label: 'Contact', render: (c) => c.contact || <span className="muted">—</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (c) => fmt(c.amount) },
    { key: 'start', label: 'Start', render: (c) => fmtDate(c.start) },
    { key: 'end', label: 'End', render: (c) => {
      const d = daysUntil(c.end); const soon = c.status === 'Active' && d >= 0 && d <= 90
      return <span className="row" style={{ gap: 6 }}>{fmtDate(c.end)}{soon && <Badge kind="b-amber"><IconAlert /> {d}d</Badge>}</span>
    } },
    { key: 'gasb', label: 'GASB 96', render: (c) => yn(c.gasb) },
    { key: 'autoRenew', label: 'Auto Renewal', render: (c) => yn(c.autoRenew) },
    { key: 'multiYear', label: 'Multi Year', render: (c) => yn(c.multiYear) },
    { key: 'status', label: 'Status', render: (c) => <Badge kind={statusBadge(c.status)}>{c.status}</Badge> },
  ]
  if (isAdmin) cols.push({
    key: 'act', label: 'Action', render: (c) => (
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => openEdit(c)}>Edit</button>
        <button className="icon-btn danger" onClick={() => confirm('Delete this contract?') && store.deleteContract(c.id)}><IconTrash /></button>
      </div>
    ),
  })

  return (
    <>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card"><span className="kpi-label">Active Contract Value</span><div className="kpi-value">{fmt(totalValue)}</div></div>
        <div className="card"><span className="kpi-label">Total Contracts</span><div className="kpi-value">{contracts.length}</div></div>
        <div className="card"><span className="kpi-label">Expiring ≤ 90 days</span><div className="kpi-value" style={{ color: expiringSoon ? 'var(--amber)' : 'inherit' }}>{expiringSoon}</div></div>
      </div>

      <TablePanel
        title="Contracts List"
        subtitle={`${contracts.length} contracts`}
        rows={contracts}
        searchKeys={['vendor', 'contact', 'status']}
        exportName="contracts.csv"
        exportRows={() => contracts.map((c) => ({ Vendor: c.vendor, Contact: c.contact, Amount: c.amount, Start: c.start, End: c.end, 'GASB 96': c.gasb ? 'Yes' : 'No', 'Auto Renewal': c.autoRenew ? 'Yes' : 'No', 'Multi Year': c.multiYear ? 'Yes' : 'No', Status: c.status }))}
        actions={isAdmin && <button className="btn btn-primary btn-sm" onClick={openAdd}><IconPlus /> Add Contract</button>}
        columns={cols}
      />

      {show && (
        <Modal title={editing ? 'Edit Contract' : 'Add Contract'} sub={editing ? 'Update this contract' : 'Create a new vendor contract'} onClose={() => setShow(false)}>
          <form className="grid" style={{ gap: 14 }} onSubmit={save}>
            <div className="form-grid">
              <div className="field"><label>Vendor *</label>
                <select className="select" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
                  <option value="">Select Vendor</option>{vendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select></div>
              <div className="field"><label>Contact Person</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="field"><label>Contract Amount ($) *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="field"><label>Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Draft</option><option>Inactive</option>
                </select></div>
              <div className="field"><label>Start Date</label><input className="input" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
              <div className="field"><label>End Date</label><input className="input" type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
            </div>
            <div className="row wrap" style={{ gap: 18 }}>
              {['gasb', 'autoRenew', 'multiYear'].map((k) => (
                <label key={k} className="row" style={{ gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
                  <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} style={{ width: 16, height: 16 }} />
                  {k === 'gasb' ? 'GASB 96' : k === 'autoRenew' ? 'Auto Renewal' : 'Multi Year'}
                </label>
              ))}
            </div>
            <FormError message={error} />
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Save Contract'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
