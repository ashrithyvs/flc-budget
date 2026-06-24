import { useState, useMemo } from 'react'
import { IconSearch, IconDownload, IconAlert } from './icons.jsx'

export function Badge({ kind, children }) {
  return <span className={'badge ' + kind}>{children}</span>
}

// Inline form error banner. Renders nothing when there's no message.
export function FormError({ message }) {
  if (!message) return null
  return (
    <div className="insight" style={{ borderColor: 'var(--red)', padding: '10px 12px' }}>
      <span className="insight-ico" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><IconAlert /></span>
      <span style={{ alignSelf: 'center', fontSize: 13 }}>{message}</span>
    </div>
  )
}

export function Modal({ title, sub, children, onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="card-title">{title}</h3>
        {sub && <p className="card-sub">{sub}</p>}
        {children}
      </div>
    </div>
  )
}

// Export array of objects to a downloadable CSV
export function downloadCSV(filename, rows) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/**
 * Reusable searchable/paginated table panel.
 * columns: [{ key, label, align, render?(row) }]
 * searchKeys: array of row keys to match against the search box.
 */
export function TablePanel({
  title, subtitle, rows, columns, searchKeys = [], actions, exportName, exportRows,
  footer, defaultPageSize = 10,
}) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchKeys])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const slice = filtered.slice(cur * pageSize, cur * pageSize + pageSize)

  return (
    <div className="card card-pad-0">
      <div className="card-head">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-sub" style={{ margin: 0 }}>{subtitle}</p>}
        </div>
        <div className="controls">
          {exportName && exportRows && (
            <button className="btn btn-sm" onClick={() => downloadCSV(exportName, exportRows())}>
              <IconDownload /> Export
            </button>
          )}
          {actions}
        </div>
      </div>

      <div className="row between wrap" style={{ padding: '12px 18px', gap: 12 }}>
        <label className="muted" style={{ fontSize: 13 }}>
          Show{' '}
          <select className="select" style={{ width: 'auto', display: 'inline-block', padding: '5px 8px' }}
            value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>{' '}entries
        </label>
        <div className="row" style={{ gap: 7 }}>
          <IconSearch className="muted" />
          <input className="input" style={{ width: 220 }} placeholder="Search…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length}><div className="empty">No matching records.</div></td></tr>
            ) : slice.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align || 'left' }} className={c.align === 'right' ? 't-amount' : ''}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot><tr>{footer}</tr></tfoot>}
        </table>
      </div>

      <div className="row between wrap" style={{ padding: '12px 18px', gap: 10 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Showing {filtered.length === 0 ? 0 : cur * pageSize + 1} to {Math.min((cur + 1) * pageSize, filtered.length)} of {filtered.length} entries
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
          {Array.from({ length: pages }, (_, i) => i).slice(Math.max(0, cur - 2), Math.max(0, cur - 2) + 5).map((p) => (
            <button key={p} className={'icon-btn' + (p === cur ? ' active' : '')}
              style={p === cur ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' } : null}
              onClick={() => setPage(p)}>{p + 1}</button>
          ))}
          <button className="icon-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
