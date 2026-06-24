import { useState, useEffect } from 'react'
import { useStore } from './store.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AddBudget from './pages/AddBudget.jsx'
import ListBudget from './pages/ListBudget.jsx'
import Vendors from './pages/Vendors.jsx'
import Contracts from './pages/Contracts.jsx'
import Users from './pages/Users.jsx'
import ManageList from './pages/ManageList.jsx'
import Import from './pages/Import.jsx'
import AuditLog from './pages/AuditLog.jsx'
import Account from './pages/Account.jsx'
import {
  IconDashboard, IconPlus, IconVendor, IconContract, IconList, IconUsers,
  IconTag, IconBuilding, IconUpload, IconSun, IconMoon, IconMenu, IconLogout, IconClock,
} from './icons.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, sub: 'Budget overview & analytics' },
  { id: 'add', label: 'Add Budget', icon: IconPlus, sub: 'Create a new budget line item', admin: true },
  { id: 'vendors', label: 'List Vendor', icon: IconVendor, sub: 'Vendor records & contract value' },
  { id: 'contracts', label: 'Contracts List', icon: IconContract, sub: 'Vendor contracts & renewals' },
  { id: 'budgets', label: 'List Budget', icon: IconList, sub: 'All budget line items' },
]
const MANAGE = [
  { id: 'users', label: 'Users', icon: IconUsers, sub: 'System users & roles' },
  { id: 'expenditures', label: 'Expenditure Type', icon: IconTag, sub: 'Manage expenditure categories' },
  { id: 'departments', label: 'Departments', icon: IconBuilding, sub: 'Manage departments' },
  { id: 'import', label: 'Import', icon: IconUpload, sub: 'Bulk import budgets from CSV', admin: true },
  { id: 'audit', label: 'Audit Log', icon: IconClock, sub: 'Who changed what, and when', admin: true },
]
const ALL = [...NAV, ...MANAGE]

export default function App() {
  const store = useStore()
  const [page, setPage] = useState('dashboard')
  const [theme, setTheme] = useState(() => localStorage.getItem('flcbudget.theme') || 'light')
  const [navOpen, setNavOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('flcbudget.theme', theme)
  }, [theme])

  if (!store.authed) return <Login onLogin={store.login} />

  if (store.loading) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-dim)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-logo" style={{ margin: '0 auto 14px', width: 48, height: 48 }}>FLC</div>
          Loading budget data…
        </div>
      </div>
    )
  }
  if (store.error) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h3 className="card-title">Can’t reach the API</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>{store.error}</p>
          <p className="muted" style={{ fontSize: 13.5 }}>Make sure the backend is running (<code>npm start</code> in <code>/server</code>).</p>
          <button className="btn" style={{ marginTop: 12 }} onClick={store.logout}>Sign out</button>
        </div>
      </div>
    )
  }

  const visible = (items) => items.filter((n) => !n.admin || store.isAdmin)
  const cur = ALL.find((n) => n.id === page) || NAV[0]
  // If a viewer lands on an admin-only page, bounce to dashboard.
  if (cur.admin && !store.isAdmin && page !== 'dashboard') { setPage('dashboard'); return null }
  const go = (id) => { setPage(id); setNavOpen(false) }

  const NavBtn = ({ n }) => (
    <button className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => go(n.id)}>
      <n.icon className="nav-ico" /> {n.label}
    </button>
  )

  return (
    <div className="app">
      <aside className={'sidebar' + (navOpen ? ' open' : '')}>
        <div className="brand">
          <div className="brand-logo">FLC</div>
          <div className="brand-name">Budget Tracker<small>Florida League of Cities</small></div>
        </div>
        {visible(NAV).map((n) => <NavBtn key={n.id} n={n} />)}
        <div className="nav-label">Manage</div>
        {visible(MANAGE).map((n) => <NavBtn key={n.id} n={n} />)}
        <div className="sidebar-foot">
          <div className="row between" style={{ padding: '6px 12px 10px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.user?.name}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{store.user?.role}</div>
            </div>
            <span className={'badge ' + (store.isAdmin ? 'b-blue' : 'b-gray')}>{store.isAdmin ? 'Admin' : 'Viewer'}</span>
          </div>
          <button className="nav-item" onClick={() => setShowAccount(true)}>
            <IconUsers className="nav-ico" /> My Account
          </button>
          <button className="nav-item" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <IconSun className="nav-ico" /> : <IconMoon className="nav-ico" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          {store.isAdmin && (
            <button className="nav-item" onClick={() => { if (confirm('Reset all data to the original test set?')) store.reset() }}>
              <IconList className="nav-ico" /> Reset test data
            </button>
          )}
          <button className="nav-item logout" onClick={store.logout}>
            <IconLogout className="nav-ico" /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row" style={{ gap: 12 }}>
            <button className="btn-ghost btn menu-btn" onClick={() => setNavOpen(!navOpen)}><IconMenu /></button>
            <div>
              <h1 className="page-title">{cur.label}</h1>
              <p className="page-sub">{cur.sub}</p>
            </div>
          </div>
          {store.isAdmin && page !== 'add' && <button className="btn btn-primary" onClick={() => go('add')}><IconPlus /> Add Budget</button>}
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard store={store} />}
          {page === 'add' && <AddBudget store={store} onDone={() => go('budgets')} />}
          {page === 'vendors' && <Vendors store={store} />}
          {page === 'contracts' && <Contracts store={store} />}
          {page === 'budgets' && <ListBudget store={store} />}
          {page === 'users' && <Users store={store} />}
          {page === 'expenditures' && (
            <ManageList title="List of Expenditure Types" nameLabel="Expenditure Name" canEdit={store.isAdmin}
              rows={store.data.expenditures} onAdd={store.addExpenditure} onUpdate={store.updateExpenditure} onToggle={store.toggleExpenditure} />
          )}
          {page === 'departments' && (
            <ManageList title="List of Departments" nameLabel="Department Name" canEdit={store.isAdmin}
              rows={store.data.departments} onAdd={store.addDepartment} onUpdate={store.updateDepartment} onToggle={store.toggleDepartment} />
          )}
          {page === 'import' && <Import store={store} />}
          {page === 'audit' && <AuditLog store={store} />}
        </main>
      </div>

      {showAccount && <Account store={store} onClose={() => setShowAccount(false)} />}
    </div>
  )
}
