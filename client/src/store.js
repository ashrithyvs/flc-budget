import { useState, useEffect, useCallback } from 'react'
import { api, tokenStore, AuthError } from './api.js'

// ---- Reference constants (static; kept client-side) ----
export const FISCAL_YEARS = [
  'FY 2022/2023', 'FY 2023/2024', 'FY 2024/2025', 'FY 2025/2026', 'FY 2026/2027', 'FY 2027/2028', 'FY 2028/2029',
]
export const CURRENT_FY = 'FY 2025/2026'
export const CLASSIFICATIONS = ['Critical', 'Enhancement', 'Mandatory']
export const STATUSES = ['Active', 'Draft', 'Review', 'Approved', 'Inactive']

export const EXPENDITURE_TYPES = [
  { id: 1, name: 'Capital' }, { id: 3, name: 'Consulting' }, { id: 4, name: 'Hardware Maintenance' },
  { id: 5, name: 'Small Equipment' }, { id: 6, name: 'Software Licenses/Hosting Fees' },
  { id: 7, name: 'Telecommunications' }, { id: 8, name: 'Travel or Training' },
]

export const CAT_COLORS = {
  'Capital': '#2563eb', 'Consulting': '#0ea5e9', 'Hardware Maintenance': '#8b5cf6',
  'Small Equipment': '#f59e0b', 'Software Licenses/Hosting Fees': '#16a34a',
  'Telecommunications': '#ec4899', 'Travel or Training': '#14b8a6',
  'Computer Training': '#94a3b8', 'Training': '#a3a3a3',
}
export const catColor = (name) => CAT_COLORS[name] || '#94a3b8'

const EMPTY = { budgets: [], vendors: [], contracts: [], users: [], expenditures: [], departments: [], unbudgeted: [] }
const USER_KEY = 'flcbudget.user'

export function useStore() {
  const [collections, setCollections] = useState(EMPTY)
  const [fy, setFyState] = useState(() => localStorage.getItem('flcbudget.fy') || CURRENT_FY)
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } })
  const [authed, setAuthed] = useState(() => !!tokenStore.get())
  const [loading, setLoading] = useState(!!tokenStore.get())
  const [error, setError] = useState(null)

  const logout = useCallback(() => {
    tokenStore.clear(); localStorage.removeItem(USER_KEY)
    setUser(null); setAuthed(false); setCollections(EMPTY)
  }, [])

  const refresh = useCallback(async () => {
    try { setCollections(await api.getAll()); setError(null) }
    catch (e) {
      if (e instanceof AuthError) { logout() }
      else setError(e.message)
    } finally { setLoading(false) }
  }, [logout])

  useEffect(() => { if (tokenStore.get()) refresh() }, [refresh])

  const login = useCallback(async (username, password) => {
    const { token, user } = await api.login(username, password)
    tokenStore.set(token); localStorage.setItem(USER_KEY, JSON.stringify(user))
    setUser(user); setAuthed(true); setLoading(true)
    await refresh()
  }, [refresh])

  // Wrap a mutating API call so the UI refreshes afterward; surface auth drops.
  const mutate = useCallback((fn) => async (...args) => {
    try { await fn(...args); await refresh() }
    catch (e) { if (e instanceof AuthError) logout(); throw e }
  }, [refresh, logout])

  const setFy = useCallback((v) => { setFyState(v); localStorage.setItem('flcbudget.fy', v) }, [])

  return {
    data: { ...collections, fy },
    authed, user, isAdmin: user?.role === 'Admin', loading, error,
    login, logout, setFy,
    changePassword: api.changePassword,
    getAudit: api.getAudit,
    addBudget: mutate(api.addBudget),
    updateBudget: mutate(api.updateBudget),
    addBudgets: mutate(api.bulkBudgets),
    deleteBudget: mutate(api.deleteBudget),
    getInvoices: api.getInvoices,
    addInvoice: mutate(api.addInvoice),
    updateInvoice: mutate(api.updateInvoice),
    deleteInvoice: mutate(api.deleteInvoice),
    addVendor: mutate(api.addVendor),
    updateVendor: mutate(api.updateVendor),
    deleteVendor: mutate(api.deleteVendor),
    addContract: mutate(api.addContract),
    updateContract: mutate(api.updateContract),
    deleteContract: mutate(api.deleteContract),
    addUser: mutate(api.addUser),
    updateUser: mutate(api.updateUser),
    toggleUser: mutate(api.toggleUser),
    addExpenditure: mutate(api.addExpenditure),
    updateExpenditure: mutate(api.updateExpenditure),
    toggleExpenditure: mutate(api.toggleExpenditure),
    addDepartment: mutate(api.addDepartment),
    updateDepartment: mutate(api.updateDepartment),
    toggleDepartment: mutate(api.toggleDepartment),
    reset: mutate(api.reset),
  }
}

// ---- formatting / analytics helpers ----
export function fmt(n) {
  const v = Math.abs(Number(n) || 0)
  return (n < 0 ? '-$' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function fmtShort(n) {
  const a = Math.abs(n)
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'k'
  return '$' + Math.round(n)
}
export const statusBadge = (s) => ({
  Active: 'b-green', Approved: 'b-green', Draft: 'b-amber', Review: 'b-blue', Inactive: 'b-gray',
}[s] || 'b-gray')

export function fyProgress(fy) {
  if (fy !== CURRENT_FY) return null
  const now = new Date()
  const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1
  const start = new Date(year, 9, 1)
  const end = new Date(year + 1, 8, 30)
  return Math.min(Math.max((now - start) / (end - start), 0), 1)
}
