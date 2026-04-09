const express = require('express')
const app = express()
app.use(express.json())

// Simple structured logger (use Winston or Pino in production)
const logger = {
  _log(level, message, meta = {}) {
    const entry = { timestamp: new Date().toISOString(), level, message, ...meta }
    console.log(JSON.stringify(entry))
  },
  info:  (msg, meta) => logger._log('INFO', msg, meta),
  warn:  (msg, meta) => logger._log('WARN', msg, meta),
  error: (msg, meta) => logger._log('ERROR', msg, meta),
  debug: (msg, meta) => process.env.LOG_LEVEL === 'debug' && logger._log('DEBUG', msg, meta),
}

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now()
  const { randomUUID } = require('crypto')
  req.requestId = randomUUID()
  res.on('finish', () => {
    logger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userAgent: req.headers['user-agent'],
    })
  })
  next()
}

// Simple metrics store
const metrics = { requests: 0, errors: 0, responseTimes: [] }

const metricsMiddleware = (req, res, next) => {
  const start = Date.now()
  metrics.requests++
  res.on('finish', () => {
    const duration = Date.now() - start
    metrics.responseTimes.push(duration)
    if (metrics.responseTimes.length > 1000) metrics.responseTimes.shift()
    if (res.statusCode >= 500) metrics.errors++
  })
  next()
}

app.use(requestLogger)
app.use(metricsMiddleware)

app.get('/users', (req, res) => {
  logger.info('Fetching users', { requestId: req.requestId })
  res.json({ data: [{ id: 1, name: 'Alice' }] })
})

app.get('/metrics', (req, res) => {
  const times = metrics.responseTimes
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
  const p95 = times.length ? times.sort((a,b)=>a-b)[Math.floor(times.length * 0.95)] : 0
  res.json({
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests ? (metrics.errors / metrics.requests * 100).toFixed(2) + '%' : '0%',
    avgResponseMs: Math.round(avg),
    p95ResponseMs: p95,
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

app.listen(3000, () => logger.info('EP15 running', { port: 3000 }))
