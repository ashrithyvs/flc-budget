import { useState } from 'react'
import { FISCAL_YEARS, CLASSIFICATIONS, STATUSES, CURRENT_FY } from '../store.js'
import { FormError } from '../components.jsx'
import { IconCheck } from '../icons.jsx'

export default function AddBudget({ store, onDone }) {
  const { vendors, departments, expenditures } = store.data
  const activeTypes = expenditures.filter((e) => e.status === 'Active')
  const [f, setF] = useState({
    vendor: '', description: '', department: departments[0]?.name || '', fy: CURRENT_FY,
    type: activeTypes[0]?.name || '', classification: 'Critical', budget: '', invoiced: '',
    gasb: false, purpose: '', tsd: '', status: 'Active',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!f.description.trim()) return setError('Description is required')
    if (!f.vendor) return setError('Please select a vendor')
    if (f.budget === '' || isNaN(parseFloat(f.budget))) return setError('Budget must be a number')
    try {
      await store.addBudget({ ...f, budget: parseFloat(f.budget) || 0, invoiced: 0 })
      setSaved(true)
      setTimeout(() => { setSaved(false); onDone && onDone() }, 1100)
    } catch (err) { setError(err.message || 'Could not save budget') }
  }

  return (
    <form className="grid" style={{ gap: 16, maxWidth: 1000 }} onSubmit={submit}>
      <div className="card">
        <div className="form-grid">
          <div className="field"><label>Vendor *</label>
            <select className="select" value={f.vendor} onChange={(e) => set('vendor', e.target.value)}>
              <option value="">Select Vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select></div>
          <div className="field"><label>Line Item Description *</label>
            <input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. New User Laptops" /></div>
          <div className="field"><label>Department</label>
            <select className="select" value={f.department} onChange={(e) => set('department', e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select></div>
          <div className="field"><label>Fiscal Year</label>
            <select className="select" value={f.fy} onChange={(e) => set('fy', e.target.value)}>
              {FISCAL_YEARS.map((y) => <option key={y}>{y}</option>)}
            </select></div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-bar" style={{ borderRadius: 0 }}>BUDGET INFORMATION</div>
        <div style={{ padding: 20 }}>
          <div className="form-grid">
            <div className="field"><label>Type of Expenditure</label>
              <select className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>
                {activeTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select></div>
            <div className="field"><label>Budget Classification</label>
              <select className="select" value={f.classification} onChange={(e) => set('classification', e.target.value)}>
                {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div className="field"><label>Budget Amount ($)</label>
              <input className="input" type="number" step="0.01" value={f.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0.00" /></div>
            <div className="field"><label>Status</label>
              <select className="select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="row" style={{ gap: 9, cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={f.gasb} onChange={(e) => set('gasb', e.target.checked)} style={{ width: 17, height: 17 }} />
                GASB 96 applicable
              </label>
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}><label>Purpose</label>
            <textarea className="input" rows={3} value={f.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="Business justification…" /></div>
          <div className="field" style={{ marginTop: 16 }}><label>TSD Comments</label>
            <textarea className="input" rows={2} value={f.tsd} onChange={(e) => set('tsd', e.target.value)} placeholder="Technology Services notes…" /></div>
        </div>
      </div>

      <FormError message={error} />
      <div className="row between wrap" style={{ gap: 10 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Tip: after saving, open the budget from List Budget → <strong>View</strong> to record its invoices.</span>
        <div className="row" style={{ gap: 10 }}>
          {saved && <span className="badge b-green"><IconCheck /> Budget saved</span>}
          <button type="submit" className="btn btn-primary">Submit Budget</button>
        </div>
      </div>
    </form>
  )
}
