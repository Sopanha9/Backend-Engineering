# EP 15 — Logging, Monitoring & Observability

> You can't fix what you can't see. Instrument everything.

---

## What you will learn
- Structured logging (JSON logs)
- Winston / Pino setup
- Request logging middleware
- Health check endpoints
- Metrics and observability

---

## 1. Structured logging

```js
// ❌ Plain text logs — hard to search and parse
console.log('User 42 logged in at 10:30')

// ✅ Structured JSON logs — searchable, filterable
logger.info('User logged in', { userId: 42, ip: '1.2.3.4', at: new Date() })
// Output: {"level":"INFO","timestamp":"...","message":"User logged in","userId":42}
```

---

## 2. Winston setup

```bash
npm install winston
```

```js
const winston = require('winston')
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ]
})

logger.info('Server started', { port: 3000 })
logger.warn('Rate limit approaching', { userId: 42, requests: 95 })
logger.error('Database connection failed', { error: err.message, stack: err.stack })
```

---

## 3. Request logger

```js
const requestLogger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method, path: req.path,
      status: res.statusCode, duration: Date.now() - start,
      requestId: req.id
    })
  })
  next()
}
```

---

## 4. Health check endpoint

```js
app.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: await checkDB() ? 'ok' : 'error',
    redis: await checkRedis() ? 'ok' : 'error',
  }
  const isHealthy = Object.values(checks).every(v => v !== 'error')
  res.status(isHealthy ? 200 : 503).json(checks)
})
```

---

## 5. Key metrics to track

```
Response time (avg, p50, p95, p99)
Error rate (5xx per minute)
Requests per second
DB query time
Cache hit rate
Memory usage
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## Next → EP 16: Security
