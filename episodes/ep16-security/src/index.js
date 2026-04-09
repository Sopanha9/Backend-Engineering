const express = require('express')
const app = express()
app.use(express.json({ limit: '10kb' })) // limit body size

// 1. Security headers (normally use helmet)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  res.removeHeader('X-Powered-By')
  next()
})

// 2. Rate limiting (normally use express-rate-limit)
const rateLimits = new Map()
const rateLimit = ({ windowMs = 60000, max = 100 } = {}) => (req, res, next) => {
  const key = req.ip
  const now = Date.now()
  const window = rateLimits.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > window.resetAt) { window.count = 0; window.resetAt = now + windowMs }
  window.count++
  rateLimits.set(key, window)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - window.count))
  if (window.count > max) return res.status(429).json({ error: 'Too many requests' })
  next()
}

// 3. Input sanitization
const sanitize = (input) => {
  if (typeof input !== 'string') return input
  return input.replace(/[<>'"]/g, '') // strip dangerous chars
}

const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') req.body[key] = sanitize(req.body[key])
    }
  }
  next()
}

// 4. CORS
const cors = (req, res, next) => {
  const allowedOrigins = ['http://localhost:3001', 'https://myapp.com']
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(204).send()
  next()
}

app.use(cors)
app.use(rateLimit({ windowMs: 60000, max: 100 }))
app.use(sanitizeBody)

app.post('/login', rateLimit({ windowMs: 900000, max: 5 }), (req, res) => {
  res.json({ message: 'login endpoint (rate limited to 5 per 15min)' })
})

app.get('/users', (req, res) => {
  res.json({ data: [{ id: 1, name: 'Alice' }] })
})

app.listen(3000, () => console.log('EP16 running on :3000'))
