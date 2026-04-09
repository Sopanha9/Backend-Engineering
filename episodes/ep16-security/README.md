# EP 16 — Security Essentials

> Security is not optional. Build it in from day one.

---

## What you will learn
- Security headers with Helmet
- Rate limiting
- CORS configuration
- Input sanitization
- SQL injection prevention
- Secrets management

---

## 1. Helmet — security headers

```bash
npm install helmet
```

```js
const helmet = require('helmet')
app.use(helmet()) // sets 11 security headers automatically

// What helmet sets:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security: max-age=...
// Content-Security-Policy: ...
// X-XSS-Protection: 1; mode=block
// (removes X-Powered-By)
```

---

## 2. Rate limiting

```bash
npm install express-rate-limit
```

```js
const rateLimit = require('express-rate-limit')

// General API limit
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 })) // 100 req/min

// Strict limit for auth routes
app.use('/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 attempts
  message: { error: 'Too many login attempts' }
}))
```

---

## 3. CORS

```bash
npm install cors
```

```js
const cors = require('cors')
app.use(cors({
  origin: ['https://myapp.com', 'http://localhost:3001'],
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // if using cookies
}))
```

---

## 4. SQL injection prevention

```js
// ❌ String interpolation — SQL injection!
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`)
// attacker sends: ' OR '1'='1 -- → returns all users

// ✅ Parameterized queries
const user = await db.query('SELECT * FROM users WHERE email = $1', [email])

// ✅ ORM (Prisma does this automatically)
const user = await prisma.user.findUnique({ where: { email } })
```

---

## 5. Never store secrets in code

```bash
# ❌ In code
const jwtSecret = 'my-hardcoded-secret'

# ✅ In environment variables
const jwtSecret = process.env.JWT_SECRET

# Use a secrets manager in production
# AWS Secrets Manager, HashiCorp Vault, Doppler
```

---

## 6. Secure password handling

```bash
npm install bcrypt
```

```js
const bcrypt = require('bcrypt')

// Hash on register (never store plain text)
const hash = await bcrypt.hash(password, 12) // 12 salt rounds

// Verify on login
const valid = await bcrypt.compare(password, hash)
if (!valid) throw new UnauthorizedError()
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/users
# Try hitting rate limit
for i in {1..10}; do curl -X POST http://localhost:3000/login; done
```

## Next → EP 17: Scaling & Performance
