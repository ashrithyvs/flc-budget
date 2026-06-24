import jwt from 'jsonwebtoken'

// Set JWT_SECRET in production. Falls back to a dev secret locally.
const SECRET = process.env.JWT_SECRET || 'flc-budget-dev-secret-change-me'
const EXPIRES = '12h'

export function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, username: user.username, role: user.role }, SECRET, { expiresIn: EXPIRES })
}

// Require a valid token for any access.
export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

// Require the Admin role (used to gate all mutations).
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin role required for this action' })
  next()
}
