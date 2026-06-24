// Server-side validation. Each validator returns { ok, errors } where errors is a
// { field: message } map. Routes turn a failed result into a 400 response.

export const FISCAL_YEARS = [
  'FY 2022/2023', 'FY 2023/2024', 'FY 2024/2025', 'FY 2025/2026', 'FY 2026/2027', 'FY 2027/2028', 'FY 2028/2029',
]
export const CLASSIFICATIONS = ['Critical', 'Enhancement', 'Mandatory']
export const BUDGET_STATUSES = ['Active', 'Draft', 'Review', 'Approved', 'Inactive']
export const RECORD_STATUSES = ['Active', 'Draft', 'Inactive']
export const ROLES = ['Admin', 'Viewer']

const isNum = (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v))
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export function validateBudget(b = {}) {
  const e = {}
  if (!b.description || !String(b.description).trim()) e.description = 'Description is required'
  if (!b.type || !String(b.type).trim()) e.type = 'Expenditure type is required'
  if (b.fy && !FISCAL_YEARS.includes(b.fy)) e.fy = 'Unknown fiscal year'
  if (!isNum(b.budget)) e.budget = 'Budget must be a number'
  else if (Number(b.budget) < 0) e.budget = 'Budget cannot be negative'
  if (b.invoiced != null && b.invoiced !== '' && !isNum(b.invoiced)) e.invoiced = 'Invoiced must be a number'
  else if (isNum(b.invoiced) && Number(b.invoiced) < 0) e.invoiced = 'Invoiced cannot be negative'
  if (b.classification && !CLASSIFICATIONS.includes(b.classification)) e.classification = 'Invalid classification'
  if (b.status && !BUDGET_STATUSES.includes(b.status)) e.status = 'Invalid status'
  return done(e)
}

export function validateVendor(v = {}) {
  const e = {}
  if (!v.name || !String(v.name).trim()) e.name = 'Vendor name is required'
  if (v.email && !emailOk(v.email)) e.email = 'Invalid email address'
  if (v.status && !['Active', 'Inactive'].includes(v.status)) e.status = 'Invalid status'
  return done(e)
}

export function validateContract(c = {}) {
  const e = {}
  if (!c.vendor || !String(c.vendor).trim()) e.vendor = 'Vendor is required'
  if (!isNum(c.amount)) e.amount = 'Amount must be a number'
  else if (Number(c.amount) < 0) e.amount = 'Amount cannot be negative'
  if (c.start && c.end && new Date(c.end) < new Date(c.start)) e.end = 'End date must be on or after the start date'
  if (c.status && !RECORD_STATUSES.includes(c.status)) e.status = 'Invalid status'
  return done(e)
}

export function validateUser(u = {}, { isNew = false } = {}) {
  const e = {}
  if (!u.name || !String(u.name).trim()) e.name = 'Name is required'
  if (!u.email || !String(u.email).trim()) e.email = 'Email is required'
  else if (!emailOk(u.email)) e.email = 'Invalid email address'
  if (!u.username || !String(u.username).trim()) e.username = 'Username is required'
  if (u.role && !ROLES.includes(u.role)) e.role = 'Invalid role'
  if (u.status && !['Active', 'Inactive'].includes(u.status)) e.status = 'Invalid status'
  if (u.password != null && u.password !== '' && String(u.password).length < 6) e.password = 'Password must be at least 6 characters'
  return done(e)
}

export function validateInvoice(v = {}) {
  const e = {}
  if (!v.invoiceNo || !String(v.invoiceNo).trim()) e.invoiceNo = 'Invoice number is required'
  if (!v.invoiceDate) e.invoiceDate = 'Invoice date is required'
  if (!v.receivedDate) e.receivedDate = 'Received date is required'
  if (!v.toAcctgDate) e.toAcctgDate = 'To-accounting date is required'
  if (!isNum(v.amount)) e.amount = 'Invoice amount must be a number'
  else if (Number(v.amount) < 0) e.amount = 'Invoice amount cannot be negative'
  return done(e)
}

export function validatePassword(next) {
  const e = {}
  if (!next || String(next).length < 6) e.next = 'New password must be at least 6 characters'
  return done(e)
}

export function validateName(name, label = 'Name') {
  const e = {}
  if (!name || !String(name).trim()) e.name = `${label} is required`
  return done(e)
}

function done(e) {
  const keys = Object.keys(e)
  return { ok: keys.length === 0, errors: e, message: keys.length ? e[keys[0]] : null }
}
