import { useState, useMemo } from 'react'
import { FISCAL_YEARS, STATUSES, CLASSIFICATIONS, fmt, statusBadge } from '../store.js'
import { Badge, TablePanel, Modal, FormError, downloadCSV } from '../components.jsx'
import { IconDownload, IconTrash } from '../icons.jsx'
import BudgetDetail from './BudgetDetail.jsx'

export default function ListBudget({ store }) {
  const { budgets, vendors, departments, expenditures } = store.data
  const isAdmin = store.isAdmin
  const typeOptions = expenditures.filter((e) => e.status === 'Active')
  const [typeF, setTypeF] = useState('All')
  const [fyF, setFyF] = useState('All')
  const [statusF, setStatusF] = useState('All')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const rows = useMemo(() => budgets.filter((b) =>
    (typeF === 'All' || b.type === typeF) &&
    (fyF === 'All' || b.fy === fyF) &&
    (statusF === 'All' || b.status === statusF)
  ), [budgets, typeF, fyF, statusF])

  const totalBudget = rows.reduce((s, b) => s + b.budget, 0)
  const totalPaid = rows.reduce((s, b) => s + b.invoiced, 0)
  const totalVar = totalBudget - totalPaid

  const summaryRows = () => rows.map((b) => ({
    'Financial Year': b.fy, Description: b.description, 'Expenditure Type': b.type,
    'Total Budget': b.budget, 'Invoices Cost': b.invoiced, 'Difference': b.budget - b.invoiced,
    Vendor: b.vendor, Status: b.status, 'GASB 96': b.gasb ? 'Yes' : 'No', Department: b.department,
  }))

  const cols = [
    { key: 'fy', label: 'FY', render: (b) => <span className="muted">{b.fy}</span> },
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Expenditure Type' },
    { key: 'budget', label: 'Total Budget', align: 'right', render: (b) => fmt(b.budget) },
    { key: 'invoiced', label: 'Invoices Cost', align: 'right', render: (b) => fmt(b.invoiced) },
    { key: 'diff', label: 'Difference', align: 'right', render: (b) => <strong className={b.budget - b.invoiced < 0 ? 'down' : 'up'}>{fmt(b.budget - b.invoiced)}</strong> },
    { key: 'vendor', label: 'Vendor' },
    { key: 'status', label: 'Status', render: (b) => <Badge kind={statusBadge(b.status)}>{b.status}</Badge> },
    { key: 'gasb', label: 'GASB 96', render: (b) => b.gasb ? <Badge kind="b-blue">Yes</Badge> : <span className="muted">No</span> },
    { key: 'act', label: 'Action', render: (b) => (
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => setViewing(b)}>View</button>
        {isAdmin && <>
          <button className="icon-btn" onClick={() => setEditing(b)}>Edit</button>
          <button className="icon-btn danger" onClick={() => confirm('Delete this budget line? Its invoices will also be removed.') && store.deleteBudget(b.id)}><IconTrash /></button>
        </>}
      </div>
    ) },
  ]

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card row between wrap" style={{ gap: 12 }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="field"><label>Fiscal Year</label>
            <select className="select" value={fyF} onChange={(e) => setFyF(e.target.value)}>
              <option>All</option>{FISCAL_YEARS.map((y) => <option key={y}>{y}</option>)}
            </select></div>
          <div className="field"><label>Expenditure Type</label>
            <select className="select" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option>All</option>{typeOptions.map((e) => <option key={e.id}>{e.name}</option>)}
            </select></div>
          <div className="field"><label>Status</label>
            <select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
              <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select></div>
          {(typeF !== 'All' || fyF !== 'All' || statusF !== 'All') &&
            <button className="btn btn-sm" style={{ alignSelf: 'end' }} onClick={() => { setTypeF('All'); setFyF('All'); setStatusF('All') }}>Clear filters</button>}
        </div>
        <div className="row" style={{ gap: 8, alignSelf: 'end' }}>
          <button className="btn btn-green btn-sm" onClick={() => downloadCSV('budget_summary.csv', summaryRows())}><IconDownload /> Budget Summary</button>
          <button className="btn btn-primary btn-sm" onClick={() => downloadCSV('invoice_detail.csv', rows.map((b) => ({ Description: b.description, Vendor: b.vendor, Invoiced: b.invoiced, Budget: b.budget })))}><IconDownload /> Invoice Detail</button>
        </div>
      </div>

      <TablePanel
        title="List Budget"
        subtitle={`${rows.length} line items`}
        rows={rows}
        searchKeys={['description', 'vendor', 'type', 'fy', 'status']}
        columns={cols}
        footer={<>
          <td colSpan={3} style={{ fontWeight: 750 }}>TOTAL</td>
          <td className="t-amount">{fmt(totalBudget)}</td>
          <td className="t-amount">{fmt(totalPaid)}</td>
          <td className="t-amount" style={{ color: totalVar < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(totalVar)}</td>
          <td colSpan={4} />
        </>}
      />

      {editing && (
        <EditBudget store={store} budget={editing} vendors={vendors} departments={departments} types={typeOptions} onClose={() => setEditing(null)} />
      )}
      {viewing && (
        <BudgetDetail store={store} budget={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function EditBudget({ store, budget, vendors, departments, types, onClose }) {
  const [f, setF] = useState({ ...budget })
  const [error, setError] = useState(null)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const save = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await store.updateBudget(budget.id, { ...f, budget: parseFloat(f.budget) || 0 })
      onClose()
    } catch (err) { setError(err.message || 'Could not save changes') }
  }
  return (
    <Modal title="Edit Budget Line" sub={budget.description} onClose={onClose}>
      <form className="grid" style={{ gap: 14 }} onSubmit={save}>
        <div className="form-grid">
          <div className="field"><label>Description</label><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="field"><label>Vendor</label>
            <select className="select" value={f.vendor} onChange={(e) => set('vendor', e.target.value)}>
              <option value="">Select Vendor</option>{vendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select></div>
          <div className="field"><label>Expenditure Type</label>
            <select className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>
              {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select></div>
          <div className="field"><label>Fiscal Year</label>
            <select className="select" value={f.fy} onChange={(e) => set('fy', e.target.value)}>
              {FISCAL_YEARS.map((y) => <option key={y}>{y}</option>)}
            </select></div>
          <div className="field"><label>Budget ($)</label><input className="input" type="number" step="0.01" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></div>
          <div className="field"><label>Invoiced</label><input className="input" value={fmt(f.invoiced || 0)} disabled title="Set from the invoices on this budget's View screen" /></div>
          <div className="field"><label>Classification</label>
            <select className="select" value={f.classification} onChange={(e) => set('classification', e.target.value)}>
              {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div className="field"><label>Status</label>
            <select className="select" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select></div>
          <div className="field"><label>Department</label>
            <select className="select" value={f.department} onChange={(e) => set('department', e.target.value)}>
              <option value="">—</option>{departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select></div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label className="row" style={{ gap: 9, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={!!f.gasb} onChange={(e) => set('gasb', e.target.checked)} style={{ width: 17, height: 17 }} /> GASB 96 applicable
            </label>
          </div>
        </div>
        <FormError message={error} />
        <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </Modal>
  )
}
