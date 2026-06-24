import { useEffect, useState } from 'react'
import { Badge, TablePanel } from '../components.jsx'

const actionBadge = (a) => ({
  create: 'b-green', update: 'b-blue', delete: 'b-red', import: 'b-blue',
  login: 'b-gray', password: 'b-amber', reset: 'b-amber',
}[a] || 'b-gray')

const fmtTs = (ts) => { try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return ts } }

export default function AuditLog({ store }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let live = true
    store.getAudit(1000).then((r) => { if (live) setRows(r) }).catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [store])

  if (error) return <div className="card empty">Couldn’t load the audit log: {error}</div>
  if (!rows) return <div className="card empty">Loading activity…</div>

  return (
    <TablePanel
      title="Audit Log"
      subtitle={`${rows.length} most recent events — who changed what, and when`}
      rows={rows}
      searchKeys={['userName', 'action', 'entity', 'summary', 'role']}
      defaultPageSize={25}
      exportName="audit_log.csv"
      exportRows={() => rows.map((r) => ({ When: r.ts, User: r.userName, Role: r.role, Action: r.action, Entity: r.entity, Details: r.summary }))}
      columns={[
        { key: 'ts', label: 'When', render: (r) => <span className="muted" style={{ fontSize: 12.5 }}>{fmtTs(r.ts)}</span> },
        { key: 'userName', label: 'User', render: (r) => <strong>{r.userName}</strong> },
        { key: 'role', label: 'Role', render: (r) => <Badge kind={r.role === 'Admin' ? 'b-blue' : 'b-gray'}>{r.role || '—'}</Badge> },
        { key: 'action', label: 'Action', render: (r) => <Badge kind={actionBadge(r.action)}>{r.action}</Badge> },
        { key: 'entity', label: 'Area' },
        { key: 'summary', label: 'Details', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.summary}</span> },
      ]}
    />
  )
}
