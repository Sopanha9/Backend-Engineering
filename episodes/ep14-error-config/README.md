# EP 14 — Error Handling & Config Management

> Handle errors like a pro. Configure your app for any environment.

---

## What you will learn
- Custom error classes
- Global error handler in Express
- Async error propagation
- Config management with env vars
- 12-factor app config pattern

---

## 1. Custom error classes

```js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true // expected errors vs bugs
  }
}

class NotFoundError  extends AppError { constructor(r='Resource') { super(`${r} not found`, 404, 'NOT_FOUND') }}
class ValidationError extends AppError { constructor(m) { super(m, 400, 'VALIDATION_ERROR') }}
class UnauthorizedError extends AppError { constructor() { super('Unauthorized', 401, 'UNAUTHORIZED') }}
class ForbiddenError extends AppError { constructor() { super('Forbidden', 403, 'FORBIDDEN') }}
class ConflictError  extends AppError { constructor(m) { super(m, 409, 'CONFLICT') }}
```

---

## 2. Global error handler

```js
// Must be LAST middleware, 4 params
app.use((err, req, res, next) => {
  if (err.isOperational) {
    // Known, expected errors
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }
  // Unknown errors — log fully, hide in prod
  console.error(err)
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})
```

---

## 3. Async error propagation

```js
// ❌ Without wrapper — unhandled promise rejections crash the app
app.get('/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id) // if this throws, Express doesn't catch it
  res.json(user)
})

// ✅ Option 1: try/catch every route (repetitive)
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id)
    res.json(user)
  } catch (err) { next(err) }
})

// ✅ Option 2: asyncHandler wrapper (clean)
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id)
  if (!user) throw new NotFoundError('User')
  res.json(user)
}))
```

---

## 4. Config management

```js
// config/index.js — single source of truth
const config = {
  port:   Number(process.env.PORT) || 3000,
  env:    process.env.NODE_ENV    || 'development',
  isDev:  process.env.NODE_ENV !== 'production',
  db: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret:    process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  }
}

// Validate required env vars at startup
const required = ['DATABASE_URL', 'JWT_SECRET']
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}

module.exports = config
```

---

## 5. .env files

```bash
# .env (never commit to git!)
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mydb
JWT_SECRET=super-secret-key

# .env.example (commit this — template for team)
PORT=3000
NODE_ENV=development
DATABASE_URL=
JWT_SECRET=
```

```bash
npm install dotenv
```
```js
require('dotenv').config() // load .env at the top of index.js
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/users/999     # 404 error
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'                 # 400 validation error
```

## Next → EP 15: Logging & Monitoring
