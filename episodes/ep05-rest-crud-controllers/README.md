# EP 05 — REST Best Practices, CRUD & Controllers

> Structure your API like a pro from day one.

---

## What you will learn
- REST API design principles and URL naming
- Controller pattern — separate HTTP logic from business logic
- Pagination, sorting, filtering
- Consistent error responses
- Status code decisions

---

## 1. REST URL naming

```
GET    /users           → list all
POST   /users           → create one
GET    /users/:id       → get one
PATCH  /users/:id       → partial update
DELETE /users/:id       → delete

# Nested
GET  /users/:id/posts   → user's posts
POST /users/:id/posts   → create post for user

# Never use verbs!
❌ /getUsers   ❌ /createUser   ❌ /deleteUser/1
✅ /users      ✅ /users        ✅ /users/1
```

---

## 2. Controller pattern

```
routes/user.routes.js        → URL + method → controller
controllers/user.controller  → req/res only, calls service
services/user.service        → business logic (EP07)
```

```js
// controller: only HTTP concerns
exports.getOne = (req, res) => {
  const user = findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({ data: user })
}
```

---

## 3. Consistent response shape

```js
// Always wrap in data key
res.json({ data: user })
res.json({ data: users, meta: { page, total } })
res.status(400).json({ error: 'message' })
res.status(400).json({ errors: ['field1 required', 'email invalid'] })
```

---

## 4. Pagination

```js
const page  = Number(req.query.page)  || 1
const limit = Math.min(Number(req.query.limit) || 10, 100)
const data  = allUsers.slice((page - 1) * limit, page * limit)
res.json({ data, meta: { page, limit, total: allUsers.length } })

// GET /users?page=2&limit=20
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

---

## Next → EP 06: Database
