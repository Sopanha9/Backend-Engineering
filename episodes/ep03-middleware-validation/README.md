# EP 03 — Middleware, Validation & Transformation

> Middleware is the backbone of every Express app. Master it here.

---

## What you will learn
- What middleware is and how it works
- The middleware execution chain
- Building reusable middleware (logger, validator, transformer)
- Input validation patterns
- Request transformation

---

## 1. What is Middleware?

Middleware is a function that runs **between** the request arriving and your route handler running.

```
Request → [middleware 1] → [middleware 2] → [route handler] → Response
```

Every middleware receives `(req, res, next)`:
- `req` — the request object
- `res` — the response object  
- `next()` — call this to pass to the next middleware. If you don't call it, the request hangs.

```js
const myMiddleware = (req, res, next) => {
  // do something
  next() // ← must call this, or call res.json() to end the chain
}

app.use(myMiddleware) // global — runs on every request
app.get('/path', myMiddleware, handler) // local — runs on this route only
```

---

## 2. Middleware execution order

Order matters. Middleware runs top to bottom.

```js
app.use(express.json())   // 1st — parse body
app.use(requestId)        // 2nd — add request ID
app.use(logger)           // 3rd — log the request
app.use('/api', routes)   // 4th — route to handlers
app.use(errorHandler)     // last — catch all errors
```

---

## 3. Logger middleware

```js
const logger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} — ${Date.now() - start}ms`)
  })
  next()
}
```

---

## 4. Validation middleware

```js
// Reusable validator factory
const validate = (schema) => (req, res, next) => {
  const errors = []
  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field]
    if (rules.required && !value) errors.push(`${field} is required`)
    if (value && rules.minLength && value.length < rules.minLength)
      errors.push(`${field} must be at least ${rules.minLength} chars`)
    if (value && rules.isEmail && !/^\S+@\S+\.\S+$/.test(value))
      errors.push(`${field} must be a valid email`)
  }
  if (errors.length) return res.status(400).json({ errors })
  next()
}

// Usage
const userSchema = {
  name:     { required: true, minLength: 2 },
  email:    { required: true, isEmail: true },
  password: { required: true, minLength: 8 },
}

app.post('/users', validate(userSchema), (req, res) => { ... })
```

---

## 5. Transform middleware

```js
// Trim all string fields in req.body
const trimBody = (req, res, next) => {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') req.body[key] = req.body[key].trim()
    }
  }
  next()
}
```

---

## 6. Early exit pattern

```js
// Middleware can end the request early — no need to call next()
const requireApiKey = (req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' }) // stops chain here
  }
  next() // only called if key is valid
}
```

---

## Run it

```bash
npm install && npm start

# Valid request
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"secret123"}'

# Invalid — triggers validation
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"J","email":"not-an-email"}'
```

---

## Next → EP 04: Authentication & Authorization
