const express = require('express')
const app = express()
app.use(express.json())

// --- Config ---
const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  db: { url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb' },
  jwt: { secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod' },
}

// --- Custom Error Classes ---
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') { super(`${resource} not found`, 404, 'NOT_FOUND') }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400, 'VALIDATION_ERROR') }
}

class UnauthorizedError extends AppError {
  constructor() { super('Unauthorized', 401, 'UNAUTHORIZED') }
}

class ForbiddenError extends AppError {
  constructor() { super('Forbidden', 403, 'FORBIDDEN') }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409, 'CONFLICT') }
}

// --- Async wrapper (avoid try/catch in every route) ---
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// --- Global Error Handler ---
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`, { stack: err.stack, code: err.code })

  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }

  // Unknown errors — hide details in production
  res.status(500).json({
    error: config.isDev ? err.message : 'Internal server error',
    ...(config.isDev && { stack: err.stack })
  })
}

// --- Routes ---
const users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }]

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) throw new NotFoundError('User')
  res.json({ data: user })
}))

app.post('/users', asyncHandler(async (req, res) => {
  const { name, email } = req.body
  if (!name || !email) throw new ValidationError('name and email are required')
  if (users.find(u => u.email === email)) throw new ConflictError('Email already taken')
  const user = { id: Date.now(), name, email }
  users.push(user)
  res.status(201).json({ data: user })
}))

app.get('/config', (req, res) => {
  res.json({ env: config.nodeEnv, port: config.port })
})

app.use(errorHandler)
app.listen(config.port, () => console.log(`EP14 running on :${config.port} [${config.nodeEnv}]`))
