import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import db, { seedIfEmpty, recalcInvoiced } from './db.js'
import { signToken, authRequired, adminOnly } from './auth.js'
import { validateBudget, validateVendor, validateContract, validateUser, validatePassword, validateName, validateInvoice } from './validation.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

seedIfEmpty()

// Health check for Render (no auth).
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ---- helpers ----
const all = (sql, ...p) => db.prepare(sql).all(...p)
const get = (sql, ...p) => db.prepare(sql).get(...p)
const run = (sql, params) => db.prepare(sql).run(params)
const bool = (v) => (v ? 1 : 0)
const budgetOut = (r) => r && ({ ...r, gasb: !!r.gasb })
const contractOut = (r) => r && ({ ...r, gasb: !!r.gasb, autoRenew: !!r.autoRenew, multiYear: !!r.multiYear })
const userOut = (r) => { if (!r) return r; const { password, ...rest } = r; return rest }

// Returns true (and sends 400) when validation failed.
const invalid = (res, result) => {
  if (result.ok) return false
  res.status(400).json({ error: result.message, errors: result.errors })
  return true
}

const auditStmt = db.prepare(`INSERT INTO audit (ts,userId,userName,role,action,entity,entityId,summary)
  VALUES (@ts,@userId,@userName,@role,@action,@entity,@entityId,@summary)`)
function logAudit(req, action, entity, entityId, summary) {
  try {
    auditStmt.run({
      ts: new Date().toISOString(), userId: req.user?.id ?? null, userName: req.user?.name || 'system',
      role: req.user?.role || '', action, entity, entityId: String(entityId ?? ''), summary: summary || '',
    })
  } catch { /* never let logging break a request */ }
}

// ===================== AUTH (public) =====================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const u = get('SELECT * FROM users WHERE lower(username) = lower(?)', username)
  if (!u || u.status !== 'Active') return res.status(401).json({ error: 'Invalid credentials or inactive account' })
  if (!u.password || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Invalid credentials' })
  logAudit({ user: u }, 'login', 'session', u.id, `${u.name} signed in`)
  res.json({ token: signToken(u), user: userOut(u) })
})

// Everything below requires a valid session.
app.use('/api', authRequired)
app.get('/api/me', (req, res) => res.json({ user: req.user }))

// ----- Self-service password change (any logged-in user) -----
app.post('/api/me/password', (req, res) => {
  const { current, next } = req.body || {}
  const vr = validatePassword(next)
  if (invalid(res, vr)) return
  const u = get('SELECT * FROM users WHERE id=?', req.user.id)
  if (!u) return res.status(404).json({ error: 'Account not found' })
  if (!u.password || !bcrypt.compareSync(current || '', u.password)) return res.status(400).json({ error: 'Current password is incorrect', errors: { current: 'Current password is incorrect' } })
  run('UPDATE users SET password=@p WHERE id=@id', { p: bcrypt.hashSync(next, 10), id: req.user.id })
  logAudit(req, 'password', 'users', req.user.id, `${req.user.name} changed their password`)
  res.json({ ok: true })
})

// ===================== AUDIT LOG (admin) =====================
app.get('/api/audit', adminOnly, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 500, 2000)
  res.json(all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', limit))
})

// ===================== BUDGETS =====================
app.get('/api/budgets', (req, res) => res.json(all('SELECT * FROM budgets ORDER BY id DESC').map(budgetOut)))

const budgetBody = (b) => ({
  description: b.description || '', type: b.type || '', fy: b.fy || '', vendor: b.vendor || '',
  budget: Number(b.budget) || 0, invoiced: Number(b.invoiced) || 0, classification: b.classification || 'Critical',
  gasb: bool(b.gasb), status: b.status || 'Active', department: b.department || '', purpose: b.purpose || '', tsd: b.tsd || '',
})

app.post('/api/budgets', adminOnly, (req, res) => {
  if (invalid(res, validateBudget(req.body))) return
  const info = run(`INSERT INTO budgets (description,type,fy,vendor,budget,invoiced,classification,gasb,status,department,purpose,tsd)
    VALUES (@description,@type,@fy,@vendor,@budget,@invoiced,@classification,@gasb,@status,@department,@purpose,@tsd)`, budgetBody(req.body || {}))
  logAudit(req, 'create', 'budgets', info.lastInsertRowid, `Created budget "${req.body?.description}" (${req.body?.fy})`)
  res.status(201).json(budgetOut(get('SELECT * FROM budgets WHERE id=?', info.lastInsertRowid)))
})

app.put('/api/budgets/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM budgets WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const merged = { ...existing, ...req.body, gasb: req.body?.gasb ?? !!existing.gasb }
  if (invalid(res, validateBudget(merged))) return
  run(`UPDATE budgets SET description=@description,type=@type,fy=@fy,vendor=@vendor,budget=@budget,invoiced=@invoiced,
    classification=@classification,gasb=@gasb,status=@status,department=@department,purpose=@purpose,tsd=@tsd WHERE id=@id`,
    { ...budgetBody(merged), id: Number(req.params.id) })
  logAudit(req, 'update', 'budgets', req.params.id, `Updated budget "${merged.description}"`)
  res.json(budgetOut(get('SELECT * FROM budgets WHERE id=?', req.params.id)))
})

app.post('/api/budgets/bulk', adminOnly, (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : []
  const stmt = db.prepare(`INSERT INTO budgets (description,type,fy,vendor,budget,invoiced,classification,gasb,status,department,purpose,tsd)
    VALUES (@description,@type,@fy,@vendor,@budget,@invoiced,@classification,@gasb,@status,@department,@purpose,@tsd)`)
  const tx = db.transaction((arr) => arr.forEach((b) => stmt.run(budgetBody(b))))
  tx(rows)
  logAudit(req, 'import', 'budgets', '', `Imported ${rows.length} budget line items`)
  res.status(201).json({ inserted: rows.length })
})

app.delete('/api/budgets/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM budgets WHERE id=?', req.params.id)
  run('DELETE FROM invoices WHERE budgetId=?', req.params.id)
  run('DELETE FROM budgets WHERE id=?', req.params.id)
  logAudit(req, 'delete', 'budgets', req.params.id, `Deleted budget "${existing?.description || req.params.id}"`)
  res.json({ ok: true })
})

// ===================== INVOICES (per budget) =====================
const invoiceBody = (v) => ({
  invoiceNo: (v.invoiceNo || '').trim(), invoiceDate: v.invoiceDate || '', receivedDate: v.receivedDate || '',
  toAcctgDate: v.toAcctgDate || '', amount: Number(v.amount) || 0, comment: (v.comment || '').trim(),
})

app.get('/api/budgets/:id/invoices', (req, res) =>
  res.json(all('SELECT * FROM invoices WHERE budgetId=? ORDER BY id', req.params.id)))

app.post('/api/budgets/:id/invoices', adminOnly, (req, res) => {
  const budget = get('SELECT * FROM budgets WHERE id=?', req.params.id)
  if (!budget) return res.status(404).json({ error: 'Budget not found' })
  if (invalid(res, validateInvoice(req.body))) return
  const info = run(`INSERT INTO invoices (budgetId,invoiceNo,invoiceDate,receivedDate,toAcctgDate,amount,comment)
    VALUES (@budgetId,@invoiceNo,@invoiceDate,@receivedDate,@toAcctgDate,@amount,@comment)`,
    { budgetId: Number(req.params.id), ...invoiceBody(req.body) })
  recalcInvoiced(req.params.id)
  logAudit(req, 'create', 'invoices', info.lastInsertRowid, `Added invoice ${req.body?.invoiceNo} to "${budget.description}"`)
  res.status(201).json(get('SELECT * FROM invoices WHERE id=?', info.lastInsertRowid))
})

app.put('/api/invoices/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM invoices WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const merged = { ...existing, ...req.body }
  if (invalid(res, validateInvoice(merged))) return
  run(`UPDATE invoices SET invoiceNo=@invoiceNo,invoiceDate=@invoiceDate,receivedDate=@receivedDate,
    toAcctgDate=@toAcctgDate,amount=@amount,comment=@comment WHERE id=@id`, { ...invoiceBody(merged), id: Number(req.params.id) })
  recalcInvoiced(existing.budgetId)
  logAudit(req, 'update', 'invoices', req.params.id, `Updated invoice ${merged.invoiceNo}`)
  res.json(get('SELECT * FROM invoices WHERE id=?', req.params.id))
})

app.delete('/api/invoices/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM invoices WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  run('DELETE FROM invoices WHERE id=?', req.params.id)
  recalcInvoiced(existing.budgetId)
  logAudit(req, 'delete', 'invoices', req.params.id, `Deleted invoice ${existing.invoiceNo}`)
  res.json({ ok: true })
})

// ===================== VENDORS =====================
app.get('/api/vendors', (req, res) => res.json(all('SELECT * FROM vendors ORDER BY name COLLATE NOCASE')))
const vendorBody = (v) => ({ name: v.name || '', contact: v.contact || '', email: v.email || '', phone: v.phone || '', status: v.status || 'Active' })
app.post('/api/vendors', adminOnly, (req, res) => {
  if (invalid(res, validateVendor(req.body))) return
  const info = run('INSERT INTO vendors (name,contact,email,phone,status) VALUES (@name,@contact,@email,@phone,@status)', vendorBody(req.body || {}))
  logAudit(req, 'create', 'vendors', info.lastInsertRowid, `Created vendor "${req.body?.name}"`)
  res.status(201).json(get('SELECT * FROM vendors WHERE id=?', info.lastInsertRowid))
})
app.put('/api/vendors/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM vendors WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const merged = { ...existing, ...req.body }
  if (invalid(res, validateVendor(merged))) return
  run('UPDATE vendors SET name=@name,contact=@contact,email=@email,phone=@phone,status=@status WHERE id=@id', { ...vendorBody(merged), id: Number(req.params.id) })
  logAudit(req, 'update', 'vendors', req.params.id, `Updated vendor "${merged.name}"`)
  res.json(get('SELECT * FROM vendors WHERE id=?', req.params.id))
})
app.delete('/api/vendors/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM vendors WHERE id=?', req.params.id)
  run('DELETE FROM vendors WHERE id=?', req.params.id)
  logAudit(req, 'delete', 'vendors', req.params.id, `Deleted vendor "${existing?.name || req.params.id}"`)
  res.json({ ok: true })
})

// ===================== CONTRACTS =====================
app.get('/api/contracts', (req, res) => res.json(all('SELECT * FROM contracts ORDER BY id DESC').map(contractOut)))
const contractBody = (c) => ({
  vendor: c.vendor || '', contact: c.contact || '', amount: Number(c.amount) || 0, start: c.start || '', end: c.end || '',
  gasb: bool(c.gasb), autoRenew: bool(c.autoRenew), multiYear: bool(c.multiYear), status: c.status || 'Active',
})
app.post('/api/contracts', adminOnly, (req, res) => {
  if (invalid(res, validateContract(req.body))) return
  const info = run(`INSERT INTO contracts (vendor,contact,amount,start,end,gasb,autoRenew,multiYear,status)
    VALUES (@vendor,@contact,@amount,@start,@end,@gasb,@autoRenew,@multiYear,@status)`, contractBody(req.body || {}))
  logAudit(req, 'create', 'contracts', info.lastInsertRowid, `Created contract for "${req.body?.vendor}"`)
  res.status(201).json(contractOut(get('SELECT * FROM contracts WHERE id=?', info.lastInsertRowid)))
})
app.put('/api/contracts/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM contracts WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const merged = { ...existing, ...req.body }
  merged.gasb = req.body?.gasb ?? !!existing.gasb
  merged.autoRenew = req.body?.autoRenew ?? !!existing.autoRenew
  merged.multiYear = req.body?.multiYear ?? !!existing.multiYear
  if (invalid(res, validateContract(merged))) return
  run(`UPDATE contracts SET vendor=@vendor,contact=@contact,amount=@amount,start=@start,end=@end,
    gasb=@gasb,autoRenew=@autoRenew,multiYear=@multiYear,status=@status WHERE id=@id`, { ...contractBody(merged), id: Number(req.params.id) })
  logAudit(req, 'update', 'contracts', req.params.id, `Updated contract for "${merged.vendor}"`)
  res.json(contractOut(get('SELECT * FROM contracts WHERE id=?', req.params.id)))
})
app.delete('/api/contracts/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM contracts WHERE id=?', req.params.id)
  run('DELETE FROM contracts WHERE id=?', req.params.id)
  logAudit(req, 'delete', 'contracts', req.params.id, `Deleted contract for "${existing?.vendor || req.params.id}"`)
  res.json({ ok: true })
})

// ===================== USERS =====================
app.get('/api/users', (req, res) => res.json(all('SELECT * FROM users ORDER BY id').map(userOut)))
app.post('/api/users', adminOnly, (req, res) => {
  if (invalid(res, validateUser(req.body, { isNew: true }))) return
  const u = req.body || {}
  const pw = u.password ? bcrypt.hashSync(u.password, 10) : bcrypt.hashSync('flc1234', 10)
  const info = run('INSERT INTO users (name,email,username,phone,role,status,password) VALUES (@name,@email,@username,@phone,@role,@status,@password)',
    { name: u.name || '', email: u.email || '', username: u.username || '', phone: u.phone || '', role: u.role || 'Viewer', status: u.status || 'Active', password: pw })
  logAudit(req, 'create', 'users', info.lastInsertRowid, `Created user "${u.name}" (${u.role || 'Viewer'})`)
  res.status(201).json(userOut(get('SELECT * FROM users WHERE id=?', info.lastInsertRowid)))
})
app.put('/api/users/:id', adminOnly, (req, res) => {
  const existing = get('SELECT * FROM users WHERE id=?', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (invalid(res, validateUser({ ...existing, ...req.body }))) return
  const u = { ...existing, ...req.body }
  const pw = req.body?.password ? bcrypt.hashSync(req.body.password, 10) : existing.password
  run('UPDATE users SET name=@name,email=@email,username=@username,phone=@phone,role=@role,status=@status,password=@password WHERE id=@id',
    { name: u.name || '', email: u.email || '', username: u.username || '', phone: u.phone || '', role: u.role || 'Viewer', status: u.status || 'Active', password: pw, id: Number(req.params.id) })
  logAudit(req, 'update', 'users', req.params.id, `Updated user "${u.name}"`)
  res.json(userOut(get('SELECT * FROM users WHERE id=?', req.params.id)))
})
app.patch('/api/users/:id/toggle', adminOnly, (req, res) => {
  run(`UPDATE users SET status = CASE status WHEN 'Active' THEN 'Inactive' ELSE 'Active' END WHERE id=@id`, { id: req.params.id })
  const u = get('SELECT * FROM users WHERE id=?', req.params.id)
  logAudit(req, 'update', 'users', req.params.id, `Set user "${u?.name}" to ${u?.status}`)
  res.json(userOut(u))
})

// ===================== EXPENDITURE TYPES & DEPARTMENTS =====================
for (const t of ['expenditures', 'departments']) {
  const label = t === 'expenditures' ? 'Expenditure type' : 'Department'
  app.get(`/api/${t}`, (req, res) => res.json(all(`SELECT * FROM ${t} ORDER BY id`)))
  app.post(`/api/${t}`, adminOnly, (req, res) => {
    if (invalid(res, validateName(req.body?.name, label))) return
    const info = run(`INSERT INTO ${t} (name,status) VALUES (@name,@status)`, { name: (req.body?.name || '').trim(), status: 'Active' })
    logAudit(req, 'create', t, info.lastInsertRowid, `Added ${label.toLowerCase()} "${req.body?.name}"`)
    res.status(201).json(get(`SELECT * FROM ${t} WHERE id=?`, info.lastInsertRowid))
  })
  app.put(`/api/${t}/:id`, adminOnly, (req, res) => {
    if (invalid(res, validateName(req.body?.name, label))) return
    run(`UPDATE ${t} SET name=@name WHERE id=@id`, { name: (req.body?.name || '').trim(), id: Number(req.params.id) })
    logAudit(req, 'update', t, req.params.id, `Renamed ${label.toLowerCase()} to "${req.body?.name}"`)
    res.json(get(`SELECT * FROM ${t} WHERE id=?`, req.params.id))
  })
  app.patch(`/api/${t}/:id/toggle`, adminOnly, (req, res) => {
    run(`UPDATE ${t} SET status = CASE status WHEN 'Active' THEN 'Inactive' ELSE 'Active' END WHERE id=@id`, { id: req.params.id })
    const row = get(`SELECT * FROM ${t} WHERE id=?`, req.params.id)
    logAudit(req, 'update', t, req.params.id, `Set ${label.toLowerCase()} "${row?.name}" to ${row?.status}`)
    res.json(row)
  })
}

// ===================== UNBUDGETED =====================
app.get('/api/unbudgeted', (req, res) => res.json(all('SELECT * FROM unbudgeted ORDER BY id')))

// ===================== Admin: reset =====================
app.post('/api/reset', adminOnly, (req, res) => { seedIfEmpty({ force: true }); logAudit(req, 'reset', 'system', '', 'Reset all data to the seed set'); res.json({ ok: true }) })

// ---- Serve the built React app from the same origin in production ----
const clientDist = join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
    res.sendFile(join(clientDist, 'index.html'))
  })
}

const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => console.log(`FLC Budget listening on http://${HOST}:${PORT}`))
