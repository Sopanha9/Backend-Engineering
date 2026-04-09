# EP 04 — Authentication & Authorization

> Auth is one of the most critical parts of any backend. Learn it right.

---

## What you will learn
- Authentication vs Authorization — the key difference
- Token-based auth (Bearer tokens)
- Password hashing
- Auth middleware
- Role-based access control (RBAC)

---

## 1. Authentication vs Authorization

```
Authentication → WHO are you?       (login, verify identity)
Authorization  → WHAT can you do?   (permissions, roles)
```

```
Request → [authenticate] → [authorize] → handler
               ↓                ↓
           401 if no token   403 if wrong role
```

---

## 2. Never store plain passwords

```js
// ❌ Never store plain text
users.push({ password: req.body.password })

// ✅ Always hash passwords
const bcrypt = require('bcrypt')
const hash = await bcrypt.hash(req.body.password, 12) // 12 = salt rounds
users.push({ passwordHash: hash })

// Verify
const valid = await bcrypt.compare(req.body.password, user.passwordHash)
```

---

## 3. Token-based auth flow

```
1. Client sends  POST /auth/login { email, password }
2. Server verifies credentials
3. Server generates a token, stores it (Redis/DB)
4. Server returns the token
5. Client sends token on every request: Authorization: Bearer <token>
6. Server validates token on each request
```

---

## 4. Auth middleware

```js
const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  const token = header.slice(7)
  const userId = sessions.get(token) // lookup token
  if (!userId) return res.status(401).json({ error: 'Invalid token' })
  req.user = getUserById(userId) // attach user to request
  next()
}
```

---

## 5. Role-based authorization

```js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

// Usage
app.get('/admin', authenticate, authorize('admin'), handler)
app.get('/reports', authenticate, authorize('admin', 'manager'), handler)
app.get('/profile', authenticate, handler) // any authenticated user
```

---

## 6. JWT (JSON Web Tokens) — production approach

```js
const jwt = require('jsonwebtoken')

// Login: generate JWT
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)

// Middleware: verify JWT (no DB lookup needed!)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.slice(7)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

---

## Run it

```bash
npm install && npm start

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Use token
curl http://localhost:3000/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Admin only route
curl http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Next → EP 05: REST Best Practices & Controllers
