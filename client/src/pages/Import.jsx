import { useState, useRef } from 'react'
import { CURRENT_FY } from '../store.js'
import { downloadCSV } from '../components.jsx'
import { IconUpload, IconCheck, IconDownload, IconAlert } from '../icons.jsx'

export default function Import({ store }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const template = () => downloadCSV('budget_import_template.csv', [{
    description: 'New User Laptops', type: 'Small Equipment', fy: CURRENT_FY, vendor: 'Dell',
    budget: 40000, invoiced: 0, classification: 'Mandatory', gasb: 'No', status: 'Active', department: 'Technology Services',
  }])

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setError(null); setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const lines = String(reader.result).split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) throw new Error('File has no data rows.')
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const idx = (names) => header.findIndex((h) => names.some((n) => h.includes(n)))
        const di = idx(['desc']), ti = idx(['type', 'expend']), fi = idx(['fy', 'year']),
          vi = idx(['vendor']), bi = idx(['budget']), ii = idx(['invoic', 'paid', 'cost']),
          ci = idx(['class']), gi = idx(['gasb']), si = idx(['status']), dpi = idx(['depart'])
        if (di < 0 || bi < 0) throw new Error('CSV must include at least "description" and "budget" columns.')
        const rows = []
        for (let i = 1; i < lines.length; i++) {
          const c = lines[i].split(',')
          const budget = parseFloat((c[bi] || '').replace(/[^0-9.\-]/g, ''))
          if (isNaN(budget)) continue
          rows.push({
            description: (c[di] || 'Imported').trim(),
            type: ti >= 0 ? (c[ti] || 'Capital').trim() : 'Capital',
            fy: fi >= 0 ? (c[fi] || CURRENT_FY).trim() : CURRENT_FY,
            vendor: vi >= 0 ? (c[vi] || '').trim() : '',
            budget,
            invoiced: ii >= 0 ? (parseFloat((c[ii] || '0').replace(/[^0-9.\-]/g, '')) || 0) : 0,
            classification: ci >= 0 ? (c[ci] || 'Critical').trim() : 'Critical',
            gasb: gi >= 0 ? /^(yes|true|1)$/i.test((c[gi] || '').trim()) : false,
            status: si >= 0 ? (c[si] || 'Active').trim() : 'Active',
            department: dpi >= 0 ? (c[dpi] || '').trim() : '',
            purpose: '', tsd: '',
          })
        }
        if (!rows.length) throw new Error('No valid rows found.')
        store.addBudgets(rows)
        setResult(rows.length)
      } catch (err) { setError(err.message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 720 }}>
      <div className="card">
        <h3 className="card-title">Import Budget</h3>
        <p className="card-sub">Upload a CSV to bulk-add budget line items. Download the template to see the expected columns.</p>
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><IconUpload /> Choose CSV File</button>
          <button className="btn" onClick={template}><IconDownload /> Download Template</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </div>

        {result != null && (
          <div className="insight" style={{ marginTop: 16, borderColor: 'var(--green)' }}>
            <span className="insight-ico" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><IconCheck /></span>
            <span style={{ alignSelf: 'center', fontSize: 13.5 }}>Imported <strong>{result}</strong> budget line item{result > 1 ? 's' : ''}. Check List Budget to review.</span>
          </div>
        )}
        {error && (
          <div className="insight" style={{ marginTop: 16, borderColor: 'var(--red)' }}>
            <span className="insight-ico" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><IconAlert /></span>
            <span style={{ alignSelf: 'center', fontSize: 13.5 }}>{error}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Expected columns</h3>
        <p className="card-sub">Header row, case-insensitive. Only <strong>description</strong> and <strong>budget</strong> are required.</p>
        <code style={{ display: 'block', background: 'var(--bg-soft)', padding: 14, borderRadius: 9, fontSize: 12.5, overflowX: 'auto' }}>
          description, type, fy, vendor, budget, invoiced, classification, gasb, status, department
        </code>
      </div>
    </div>
  )
}
