const express = require('express')
const app = express()
app.use(express.json())

// --- Custom Middlewares ---

// 1. Logger middleware
const logger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} — ${Date.now() - start}ms`)
  })
  next()
}

// 2. Validation middleware factory
const validate = (schema) => (req, res, next) => {
  const errors = []
  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field]
    if (rules.required && (value === undefined || value === '')) {
      errors.push(`${field} is required`)
    }
    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`)
    }
    if (value && rules.isEmail && !/^\S+@\S+\.\S+$/.test(value)) {
      errors.push(`${field} must be a valid email`)
    }
  }
  if (errors.length > 0) return res.status(400).json({ errors })
  next()
}

// 3. Transform middleware — trim strings on req.body
const trimBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') req.body[key] = req.body[key].trim()
    }
  }
  next()
}

// 4. Request ID middleware
const { randomUUID } = require('crypto')
const requestId = (req, res, next) => {
  req.id = randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}

// Apply global middlewares
app.use(requestId)
app.use(logger)
app.use(trimBody)

// Schema-validated route
const userSchema = {
  name: { required: true, minLength: 2 },
  email: { required: true, isEmail: true },
  password: { required: true, minLength: 8 },
}

app.post('/users', validate(userSchema), (req, res) => {
  res.status(201).json({ data: { id: 1, ...req.body, password: undefined } })
})

app.get('/users', (req, res) => {
  res.json({ data: [], requestId: req.id })
})

app.listen(3000, () => console.log('EP03 running on :3000'))
