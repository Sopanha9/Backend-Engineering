const express = require('express')
const crypto = require('crypto')
const app = express()
app.use(express.json())

// Simple token store (use Redis in production)
const sessions = new Map()

// ---- Helpers ----
const hashPassword = (password) =>
  crypto.createHash('sha256').update(password + 'salt').digest('hex')

const generateToken = () => crypto.randomBytes(32).toString('hex')

// Fake user DB
const users = [
  { id: 1, email: 'admin@example.com', passwordHash: hashPassword('password123'), role: 'admin' },
  { id: 2, email: 'user@example.com', passwordHash: hashPassword('password456'), role: 'user' },
]

// ---- Auth Middleware ----
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = authHeader.slice(7)
  const userId = sessions.get(token)
  if (!userId) return res.status(401).json({ error: 'Token expired or invalid' })
  req.user = users.find(u => u.id === userId)
  next()
}

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden — insufficient permissions' })
  }
  next()
}

// ---- Routes ----
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email)
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = generateToken()
  sessions.set(token, user.id)
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

app.post('/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization.slice(7)
  sessions.delete(token)
  res.status(204).send()
})

app.get('/profile', authenticate, (req, res) => {
  res.json({ data: { id: req.user.id, email: req.user.email, role: req.user.role } })
})

app.get('/admin/dashboard', authenticate, authorize('admin'), (req, res) => {
  res.json({ data: { message: 'Welcome admin!', totalUsers: users.length } })
})

app.listen(3000, () => console.log('EP04 running on :3000'))
