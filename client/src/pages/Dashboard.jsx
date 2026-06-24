import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  FISCAL_YEARS, fmt, fmtShort, catColor, fyProgress, statusBadge,
} from '../store.js'
import { Badge, TablePanel } from '../components.jsx'
import { IconWallet, IconCheck, IconAlert, IconTrend } from '../icons.jsx'

function Stat({ label, value, tint, foot, footClass }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value" style={{ fontSize: 22, marginTop: 6, color: tint }}>{value}</div>
      {foot && <div className={'kpi-foot ' + (footClass || 'muted')}>{foot}</div>}
    </div>
  )
}

function CTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="card" style={{ padding: '10px 12px', boxShadow: 'var(--shadow-lg)' }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="row" style={{ gap: 8, fontSize: 12.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color || p.fill }} />
          <span className="muted">{p.name}:</span><strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ store }) {
  const { budgets, unbudgeted, fy } = store.data
  const [activeCat, setActiveCat] = useState(null)

  const rows = useMemo(() => budgets.filter((b) => b.fy === fy), [budgets, fy])

  const byCat = useMemo(() => {
    const map = {}
    rows.forEach((b) => {
      if (!map[b.type]) map[b.type] = { type: b.type, budget: 0, paid: 0 }
      map[b.type].budget += b.budget
      map[b.type].paid += b.invoiced
    })
    return Object.values(map).map((c) => ({
      ...c, color: catColor(c.type), variance: c.budget - c.paid,
      pct: c.budget > 0 ? (c.paid / c.budget) * 100 : (c.paid > 0 ? 999 : 0),
    })).sort((a, b) => b.budget - a.budget)
  }, [rows])

  const totalBudget = rows.reduce((s, b) => s + b.budget, 0)
  const totalPaid = rows.reduce((s, b) => s + b.invoiced, 0)
  const variance = totalBudget - totalPaid
  const utilized = totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0
  const overCount = rows.filter((b) => b.invoiced > b.budget).length
  const unbudgetedTotal = unbudgeted.reduce((s, u) => s + u.amount, 0)
  const progPct = fyProgress(fy) == null ? null : Math.round(fyProgress(fy) * 100)

  const pacing = progPct == null ? null
    : utilized > progPct + 5 ? { kind: 'b-red', text: `Spending is ahead of the calendar — ${utilized}% of budget used with ${progPct}% of the year gone.` }
    : utilized < progPct - 5 ? { kind: 'b-green', text: `Spending is tracking under the calendar — ${utilized}% used vs ${progPct}% of the year elapsed.` }
    : { kind: 'b-blue', text: `Spending is on pace — ${utilized}% used against ${progPct}% of the year.` }

  const detail = useMemo(() => activeCat ? rows.filter((b) => b.type === activeCat) : [], [rows, activeCat])
  const chartData = useMemo(() => byCat.map((c) => ({ ...c, paidColor: c.paid > c.budget ? '#dc2626' : c.color })), [byCat])

  const barColor = (pct) => pct > 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'

  return (
    <div className="grid" style={{ gap: 18 }}>
      {/* Header band */}
      <div className="card row between wrap" style={{ gap: 14 }}>
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 19, color: 'var(--navy)' }}>Budget Dashboard</h2>
            {progPct != null && <Badge kind="b-blue">{progPct}% through {fy}</Badge>}
          </div>
          <p className="page-sub" style={{ marginTop: 4 }}>Budget vs actual analysis for the selected fiscal year.</p>
        </div>
        <div className="field" style={{ minWidth: 200 }}>
          <label>Fiscal Year</label>
          <select className="select" value={fy} onChange={(e) => { store.setFy(e.target.value); setActiveCat(null) }}>
            {FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Pacing meter */}
      <div className="card">
        <div className="row between"><h3 className="card-title">Pacing</h3>{pacing && <Badge kind={pacing.kind}>{utilized > (progPct || 0) ? 'Ahead' : utilized < (progPct || 0) ? 'Under' : 'On pace'}</Badge>}</div>
        <div className="grid" style={{ gap: 14, marginTop: 10 }}>
          <div>
            <div className="row between" style={{ marginBottom: 6, fontSize: 13 }}><span className="muted">Budget utilized</span><span style={{ fontWeight: 650 }}>{utilized}% · {fmt(totalPaid)}</span></div>
            <div className="progress" style={{ height: 10 }}><span style={{ width: Math.min(utilized, 100) + '%', background: utilized > (progPct || 100) ? 'var(--red)' : 'linear-gradient(90deg,var(--brand),var(--navy))' }} /></div>
          </div>
          {progPct != null && (
            <div>
              <div className="row between" style={{ marginBottom: 6, fontSize: 13 }}><span className="muted">Fiscal year elapsed</span><span style={{ fontWeight: 650 }}>{progPct}%</span></div>
              <div className="progress" style={{ height: 10 }}><span style={{ width: progPct + '%', background: 'var(--text-faint)' }} /></div>
            </div>
          )}
        </div>
        {pacing && <p className="muted" style={{ fontSize: 13, marginTop: 12, marginBottom: 0 }}>{pacing.text}</p>}
      </div>

      {/* Stat strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <Stat label="Total Budget" value={fmtShort(totalBudget)} foot={`${rows.length} line items`} />
        <Stat label="Invoiced / Paid" value={fmtShort(totalPaid)} foot={`${utilized}% utilized`} />
        <Stat label="Variance" value={fmtShort(variance)} tint={variance >= 0 ? 'var(--green)' : 'var(--red)'} foot={variance >= 0 ? 'Under budget' : 'Over budget'} footClass={variance >= 0 ? 'up' : 'down'} />
        <Stat label="Over Budget" value={overCount} tint={overCount ? 'var(--amber)' : undefined} foot="line items over" footClass={overCount ? 'down' : 'muted'} />
      </div>

      {/* Budget vs invoiced — horizontal bars */}
      <div className="card">
        <div className="row between">
          <div><h3 className="card-title">Budget vs Invoiced by Category</h3><p className="card-sub" style={{ margin: 0 }}>Click a bar to drill into its line items</p></div>
          <div className="row" style={{ gap: 14, fontSize: 12.5 }}>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#94a3b8' }} /> Budget</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#2563eb' }} /> Invoiced</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#dc2626' }} /> Over</span>
          </div>
        </div>
        {byCat.length === 0 ? <div className="empty">No budget data for {fy}.</div> : (
          <ResponsiveContainer width="100%" height={Math.max(byCat.length * 54 + 40, 220)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 16, left: 6, bottom: 6 }} barGap={2}
              onClick={(e) => e?.activeLabel && setActiveCat(e.activeLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="type" stroke="var(--text-faint)" fontSize={11.5} tickLine={false} axisLine={false} width={120} />
              <Tooltip content={<CTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
              <Bar dataKey="budget" name="Budget" fill="#94a3b8" radius={[0, 4, 4, 0]} cursor="pointer" barSize={14} />
              <Bar dataKey="paid" name="Invoiced" radius={[0, 4, 4, 0]} cursor="pointer" barSize={14}>
                {chartData.map((c) => <Cell key={c.type} fill={c.paidColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Utilization breakdown */}
      <div className="card">
        <h3 className="card-title">Category utilization</h3>
        <p className="card-sub">How much of each category's budget has been invoiced</p>
        <div className="grid" style={{ gap: 14 }}>
          {byCat.map((c) => {
            const over = c.paid > c.budget && c.budget > 0
            const noBudget = c.budget === 0 && c.paid > 0
            return (
              <div key={c.type} style={{ cursor: 'pointer' }} onClick={() => setActiveCat(c.type)}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span className="row" style={{ gap: 8, fontSize: 13.5, fontWeight: 550 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(c.paid)} <span className="muted" style={{ fontWeight: 500 }}>/ {fmt(c.budget)}</span></span>
                </div>
                <div className="progress" style={{ height: 8 }}><span style={{ width: Math.min(c.pct, 100) + '%', background: barColor(c.pct) }} /></div>
                <div className="row between" style={{ marginTop: 5 }}>
                  <span style={{ fontSize: 12, color: barColor(c.pct) }}>
                    {noBudget ? <><IconAlert /> Unbudgeted spend</> : over ? <><IconAlert /> Over by {fmt(c.paid - c.budget)}</> : `${Math.round(c.pct)}% used`}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>{fmt(Math.max(c.variance, 0))} left</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category drill-down */}
      {activeCat && (
        <TablePanel
          title={`Category Details — ${activeCat}`}
          subtitle="Line items in the selected category"
          rows={detail}
          searchKeys={['description', 'vendor', 'status']}
          actions={<button className="btn btn-sm" onClick={() => setActiveCat(null)}>Clear</button>}
          columns={[
            { key: 'description', label: 'Description' },
            { key: 'classification', label: 'Class', render: (b) => <Badge kind="b-gray">{b.classification}</Badge> },
            { key: 'budget', label: 'Budget', align: 'right', render: (b) => fmt(b.budget) },
            { key: 'invoiced', label: 'Paid', align: 'right', render: (b) => fmt(b.invoiced) },
            { key: 'variance', label: 'Variance', align: 'right', render: (b) => <span className={b.budget - b.invoiced < 0 ? 'down' : 'up'}>{fmt(b.budget - b.invoiced)}</span> },
            { key: 'vendor', label: 'Vendor' },
            { key: 'status', label: 'Status', render: (b) => <Badge kind={statusBadge(b.status)}>{b.status}</Badge> },
          ]}
        />
      )}

      {/* Unbudgeted */}
      <TablePanel
        title="Unbudgeted Items"
        subtitle="Spend recorded without an approved budget line"
        rows={unbudgeted}
        searchKeys={['description', 'type', 'vendor']}
        exportName="unbudgeted_items.csv"
        exportRows={() => unbudgeted.map((u) => ({ Description: u.description, Expenditure: u.type, Amount: u.amount, Vendor: u.vendor }))}
        columns={[
          { key: 'description', label: 'Description' },
          { key: 'type', label: 'Expenditure' },
          { key: 'amount', label: 'Amount', align: 'right', render: (u) => fmt(u.amount) },
          { key: 'vendor', label: 'Vendor' },
        ]}
        footer={<>
          <td style={{ fontWeight: 750 }}>Total Unbudgeted</td><td /><td className="t-amount" style={{ color: 'var(--amber)' }}>{fmt(unbudgetedTotal)}</td><td />
        </>}
      />
    </div>
  )
}
