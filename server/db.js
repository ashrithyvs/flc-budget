import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { seedData } from './seed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// DB_PATH lets Render mount a persistent disk; defaults to a local file.
const DB_PATH = process.env.DB_PATH || join(__dirname, 'flcbudget.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT, type TEXT, fy TEXT, vendor TEXT,
    budget REAL DEFAULT 0, invoiced REAL DEFAULT 0,
    classification TEXT, gasb INTEGER DEFAULT 0, status TEXT,
    department TEXT, purpose TEXT, tsd TEXT
  );
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, contact TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT, contact TEXT, amount REAL DEFAULT 0,
    start TEXT, end TEXT, gasb INTEGER DEFAULT 0,
    autoRenew INTEGER DEFAULT 0, multiYear INTEGER DEFAULT 0, status TEXT DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT, username TEXT, phone TEXT, role TEXT DEFAULT 'Viewer', status TEXT DEFAULT 'Active',
    password TEXT
  );
  CREATE TABLE IF NOT EXISTS expenditures (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, status TEXT DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, status TEXT DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS unbudgeted (
    id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, type TEXT, amount REAL DEFAULT 0, vendor TEXT
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT, userId INTEGER, userName TEXT, role TEXT,
    action TEXT, entity TEXT, entityId TEXT, summary TEXT
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budgetId INTEGER,
    invoiceNo TEXT, invoiceDate TEXT, receivedDate TEXT, toAcctgDate TEXT,
    amount REAL DEFAULT 0, comment TEXT
  );
`)

// budgets.invoiced is kept in sync as the sum of its invoices.
export function recalcInvoiced(budgetId) {
  const sum = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM invoices WHERE budgetId=?').get(budgetId).s
  db.prepare('UPDATE budgets SET invoiced=? WHERE id=?').run(sum, budgetId)
  return sum
}

export function seedIfEmpty({ force = false } = {}) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM budgets').get().n
  if (count > 0 && !force) return false
  if (force) {
    for (const t of ['budgets', 'vendors', 'contracts', 'users', 'expenditures', 'departments', 'unbudgeted', 'invoices']) {
      db.exec(`DELETE FROM ${t}`)
    }
  }
  const ins = {
    budgets: db.prepare(`INSERT INTO budgets (description,type,fy,vendor,budget,invoiced,classification,gasb,status,department,purpose,tsd)
      VALUES (@description,@type,@fy,@vendor,@budget,@invoiced,@classification,@gasb,@status,@department,@purpose,@tsd)`),
    invoice: db.prepare(`INSERT INTO invoices (budgetId,invoiceNo,invoiceDate,receivedDate,toAcctgDate,amount,comment)
      VALUES (@budgetId,@invoiceNo,@invoiceDate,@receivedDate,@toAcctgDate,@amount,@comment)`),
    vendors: db.prepare(`INSERT INTO vendors (name,contact,email,phone,status) VALUES (@name,@contact,@email,@phone,@status)`),
    contracts: db.prepare(`INSERT INTO contracts (vendor,contact,amount,start,end,gasb,autoRenew,multiYear,status)
      VALUES (@vendor,@contact,@amount,@start,@end,@gasb,@autoRenew,@multiYear,@status)`),
    users: db.prepare(`INSERT INTO users (name,email,username,phone,role,status,password) VALUES (@name,@email,@username,@phone,@role,@status,@password)`),
    expenditures: db.prepare(`INSERT INTO expenditures (name,status) VALUES (@name,@status)`),
    departments: db.prepare(`INSERT INTO departments (name,status) VALUES (@name,@status)`),
    unbudgeted: db.prepare(`INSERT INTO unbudgeted (description,type,amount,vendor) VALUES (@description,@type,@amount,@vendor)`),
  }
  const data = seedData()
  const tx = db.transaction(() => {
    let invSeq = 1000
    data.budgets.forEach((r) => {
      const info = ins.budgets.run({ purpose: '', tsd: '', ...r, gasb: r.gasb ? 1 : 0 })
      // Seed one opening invoice so the itemized total matches the seeded invoiced amount.
      if (r.invoiced && r.invoiced > 0) {
        const yr = (String(r.fy).match(/(\d{4})/) || [])[1] || '2025'
        const d = `${yr}-11-15`
        ins.invoice.run({
          budgetId: info.lastInsertRowid, invoiceNo: 'INV-' + (++invSeq),
          invoiceDate: d, receivedDate: d, toAcctgDate: d, amount: r.invoiced, comment: 'Opening balance (seed)',
        })
      }
    })
    data.vendors.forEach((r) => ins.vendors.run(r))
    data.contracts.forEach((r) => ins.contracts.run({ ...r, gasb: r.gasb ? 1 : 0, autoRenew: r.autoRenew ? 1 : 0, multiYear: r.multiYear ? 1 : 0 }))
    data.users.forEach((r) => ins.users.run(r))
    data.expenditures.forEach((r) => ins.expenditures.run(r))
    data.departments.forEach((r) => ins.departments.run(r))
    data.unbudgeted.forEach((r) => ins.unbudgeted.run(r))
  })
  tx()
  return true
}

export default db
