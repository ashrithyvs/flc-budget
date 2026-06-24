import { useEffect, useState } from 'react'
import { fmt, statusBadge } from '../store.js'
import { Badge, FormError } from '../components.jsx'
import { IconPlus, IconTrash, IconCheck } from '../icons.jsx'

const BLANK = { invoiceNo: '', invoiceDate: '', receivedDate: '', toAcctgDate: '', amount: '', comment: '' }

function Info({ label, children }) {
  return <div><div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div><div style={{ fontSize: 13.5, fontWeight: 550, marginTop: 2 }}>{children}</div></div>
}

export default function BudgetDetail({ store, budget, onClose }) {
  const isAdmin = store.isAdmin
  const [invoices, setInvoices] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => store.getInvoices(budget.id).then(setInvoices).catch((e) => setError(e.message))
  useEffect(() => { load() }, [budget.id])

  const total = (invoices || []).reduce((s, i) => s + i.amount, 0)
  const variance = budget.budget - total

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const resetForm = () => { setForm(BLANK); setEditingId(null); setError(null) }
  const startEdit = (inv) => { setEditingId(inv.id); setForm({ invoiceNo: inv.invoiceNo, invoiceDate: inv.invoiceDate, receivedDate: inv.receivedDate, toAcctgDate: inv.toAcctgDate, amount: inv.amount, comment: inv.comment || '' }); setError(null) }

  const submit = async (e) => {
    e.preventDefault(); setError(null); setBusy(true)
    const body = { ...form, amount: parseFloat(form.amount) || 0 }
    try {
      if (editingId) await store.updateInvoice(editingId, body)
      else await store.addInvoice(budget.id, body)
      resetForm(); await load()
    } catch (err) { setError(err.message || 'Could not save invoice') }
    finally { setBusy(false) }
  }
  const del = async (inv) => {
    if (!confirm(`Delete invoice ${inv.invoiceNo}?`)) return
    try { await store.deleteInvoice(inv.id); await load() } catch (err) { setError(err.message) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <h3 className="card-title">{budget.description}</h3>
          <button className="icon-btn" onClick={onClose}>Close</button>
        </div>
        <p className="card-sub">Budget detail and invoices</p>

        <div className="section-bar" style={{ marginBottom: 14 }}>BUDGET INFORMATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <Info label="Fiscal Year">{budget.fy}</Info>
          <Info label="Expenditure Type">{budget.type}</Info>
          <Info label="Vendor">{budget.vendor || '—'}</Info>
          <Info label="Department">{budget.department || '—'}</Info>
          <Info label="Classification"><Badge kind="b-gray">{budget.classification}</Badge></Info>
          <Info label="Status"><Badge kind={statusBadge(budget.status)}>{budget.status}</Badge></Info>
          <Info label="GASB 96">{budget.gasb ? 'Yes' : 'No'}</Info>
          <Info label="Budget Amount"><span style={{ color: 'var(--navy)' }}>{fmt(budget.budget)}</span></Info>
        </div>

        <div className="section-bar" style={{ marginBottom: 0, borderRadius: '9px 9px 0 0' }}>INVOICE INFORMATION</div>
        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 9px 9px' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice No.</th><th>Invoice Date</th><th>Received</th><th>To Acctg</th>
                <th style={{ textAlign: 'right' }}>Amount</th><th>Comment</th>{isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {invoices == null ? (
                <tr><td colSpan={isAdmin ? 7 : 6}><div className="empty">Loading…</div></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6}><div className="empty">No invoices yet{isAdmin ? ' — add one below.' : '.'}</div></td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoiceNo}</td>
                  <td className="muted">{inv.invoiceDate}</td>
                  <td className="muted">{inv.receivedDate}</td>
                  <td className="muted">{inv.toAcctgDate}</td>
                  <td className="t-amount">{fmt(inv.amount)}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 160 }}>{inv.comment}</td>
                  {isAdmin && <td><div className="row" style={{ gap: 6 }}>
                    <button className="icon-btn" onClick={() => startEdit(inv)}>Edit</button>
                    <button className="icon-btn danger" onClick={() => del(inv)}><IconTrash /></button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ fontWeight: 750 }}>Total Invoices</td>
                <td className="t-amount">{fmt(total)}</td>
                <td colSpan={isAdmin ? 2 : 1} />
              </tr>
              <tr>
                <td colSpan={4} style={{ fontWeight: 750 }}>Variance (budget − invoices)</td>
                <td className="t-amount" style={{ color: variance < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(variance)}</td>
                <td colSpan={isAdmin ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
        </div>

        {isAdmin && (
          <form onSubmit={submit} style={{ marginTop: 16 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13.5 }}>{editingId ? 'Edit invoice' : 'Add invoice'}</strong>
              {editingId && <button type="button" className="icon-btn" onClick={resetForm}>Cancel edit</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="field"><label>Invoice No. *</label><input className="input" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} /></div>
              <div className="field"><label>Invoice Date *</label><input className="input" type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} /></div>
              <div className="field"><label>Amount ($) *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
              <div className="field"><label>Received Date *</label><input className="input" type="date" value={form.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} /></div>
              <div className="field"><label>To Acctg Date *</label><input className="input" type="date" value={form.toAcctgDate} onChange={(e) => set('toAcctgDate', e.target.value)} /></div>
              <div className="field"><label>Comment</label><input className="input" value={form.comment} onChange={(e) => set('comment', e.target.value)} /></div>
            </div>
            <FormError message={error} />
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {editingId ? <><IconCheck /> Save invoice</> : <><IconPlus /> Add invoice</>}
              </button>
            </div>
          </form>
        )}
        {!isAdmin && error && <div style={{ marginTop: 12 }}><FormError message={error} /></div>}
      </div>
    </div>
  )
}
