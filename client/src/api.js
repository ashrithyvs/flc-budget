// Thin REST client with bearer-token auth.
// In dev, Vite proxies /api to the Express server (see vite.config.js).
// In production, Express serves both the API and this app from the same origin.
const BASE = import.meta.env.FLC_API_URL || ''
const TOKEN_KEY = 'flcbudget.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Thrown on 401 so the app can drop back to the login screen.
export class AuthError extends Error {}

async function req(path, opts = {}) {
  const token = tokenStore.get()
  const res = await fetch(BASE + '/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 401) { tokenStore.clear(); throw new AuthError('Session expired') }
  if (!res.ok) {
    let msg = `API ${path} -> ${res.status}`
    try { const j = await res.json(); if (j.error) msg = j.error } catch {}
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  login: (username, password) => req('/login', { method: 'POST', body: { username, password } }),
  changePassword: (current, next) => req('/me/password', { method: 'POST', body: { current, next } }),
  getAudit: (limit = 500) => req('/audit?limit=' + limit),

  getAll: () => Promise.all([
    req('/budgets'), req('/vendors'), req('/contracts'), req('/users'),
    req('/expenditures'), req('/departments'), req('/unbudgeted'),
  ]).then(([budgets, vendors, contracts, users, expenditures, departments, unbudgeted]) =>
    ({ budgets, vendors, contracts, users, expenditures, departments, unbudgeted })),

  addBudget: (b) => req('/budgets', { method: 'POST', body: b }),
  updateBudget: (id, b) => req('/budgets/' + id, { method: 'PUT', body: b }),
  bulkBudgets: (arr) => req('/budgets/bulk', { method: 'POST', body: arr }),
  deleteBudget: (id) => req('/budgets/' + id, { method: 'DELETE' }),

  getInvoices: (budgetId) => req('/budgets/' + budgetId + '/invoices'),
  addInvoice: (budgetId, inv) => req('/budgets/' + budgetId + '/invoices', { method: 'POST', body: inv }),
  updateInvoice: (id, inv) => req('/invoices/' + id, { method: 'PUT', body: inv }),
  deleteInvoice: (id) => req('/invoices/' + id, { method: 'DELETE' }),

  addVendor: (v) => req('/vendors', { method: 'POST', body: v }),
  updateVendor: (id, v) => req('/vendors/' + id, { method: 'PUT', body: v }),
  deleteVendor: (id) => req('/vendors/' + id, { method: 'DELETE' }),

  addContract: (c) => req('/contracts', { method: 'POST', body: c }),
  updateContract: (id, c) => req('/contracts/' + id, { method: 'PUT', body: c }),
  deleteContract: (id) => req('/contracts/' + id, { method: 'DELETE' }),

  addUser: (u) => req('/users', { method: 'POST', body: u }),
  updateUser: (id, u) => req('/users/' + id, { method: 'PUT', body: u }),
  toggleUser: (id) => req(`/users/${id}/toggle`, { method: 'PATCH' }),

  addExpenditure: (name) => req('/expenditures', { method: 'POST', body: { name } }),
  updateExpenditure: (id, name) => req('/expenditures/' + id, { method: 'PUT', body: { name } }),
  toggleExpenditure: (id) => req(`/expenditures/${id}/toggle`, { method: 'PATCH' }),

  addDepartment: (name) => req('/departments', { method: 'POST', body: { name } }),
  updateDepartment: (id, name) => req('/departments/' + id, { method: 'PUT', body: { name } }),
  toggleDepartment: (id) => req(`/departments/${id}/toggle`, { method: 'PATCH' }),

  reset: () => req('/reset', { method: 'POST' }),
}
