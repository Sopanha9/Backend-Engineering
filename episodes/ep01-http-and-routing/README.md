# EP 01 — HTTP & Routing in Express.js

> **Stack:** Node.js + Express.js | **Level:** Junior dev

---

## What you will learn
- How HTTP works (request → response cycle)
- HTTP methods — GET, POST, PUT, PATCH, DELETE
- Status codes — 2xx, 4xx, 5xx
- Express routing — params, query, body
- Router pattern — splitting routes into files

---

## 1. How HTTP works

```
Client ──── HTTP Request ────► Server
Client ◄─── HTTP Response ──── Server
```

**Request anatomy:**
```
POST /api/users HTTP/1.1
Content-Type: application/json

{ "name": "John", "email": "john@example.com" }
```

| Part | Description |
|---|---|
| `POST` | Method — what action |
| `/api/users` | Path — which resource |
| Headers | Metadata (Content-Type, Authorization) |
| Body | Data payload (POST/PUT/PATCH only) |

---

## 2. HTTP Methods

| Method | Action | Body? | Example |
|---|---|---|---|
| `GET` | Read | ❌ | `GET /users` |
| `POST` | Create | ✅ | `POST /users` |
| `PUT` | Replace all | ✅ | `PUT /users/1` |
| `PATCH` | Update part | ✅ | `PATCH /users/1` |
| `DELETE` | Remove | ❌ | `DELETE /users/1` |

---

## 3. Status Codes

| Range | Meaning | Examples |
|---|---|---|
| 2xx | ✅ Success | 200 OK, 201 Created, 204 No Content |
| 4xx | ❌ Client error | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 5xx | 💥 Server error | 500 Internal Server Error |

Quick rule: **4xx = your fault, 5xx = my fault**

---

## 4. Express Routing

```js
// Route = METHOD + PATH + HANDLER
app.get('/users', (req, res) => { ... })
app.post('/users', (req, res) => { ... })
app.patch('/users/:id', (req, res) => { ... })
app.delete('/users/:id', (req, res) => { ... })
```

### Reading request data

```js
req.params.id     // /users/:id  → dynamic segment
req.query.page    // ?page=2     → query string
req.body.name     // POST body   → JSON field
```

### Sending responses

```js
res.json({ data })               // 200 + JSON
res.status(201).json({ data })   // 201 + JSON
res.status(204).send()           // no body
res.status(404).json({ error })  // error
```

---

## 5. Router — split routes into files

```
src/
├── app.js
├── index.js
└── routes/
    ├── index.js        ← mounts all routers
    └── user.routes.js  ← /users routes
```

```js
// routes/user.routes.js
const { Router } = require('express')
const router = Router()

router.get('/', handler)
router.post('/', handler)
router.get('/:id', handler)

module.exports = router
```

```js
// app.js
app.use('/api', require('./routes'))
```

---

## 6. Common mistakes

```js
// ❌ Missing express.json() → req.body is undefined
app.use(express.json()) // ✅ add this before routes

// ❌ Wrong order — :id catches /me first
app.get('/users/:id', h)
app.get('/users/me', h) // never reached!

// ✅ Specific routes first
app.get('/users/me', h)
app.get('/users/:id', h)

// ❌ Sending response twice — crashes
res.json([])
res.json({ error }) // Error: headers already sent

// ✅ Use return
if (!ok) return res.status(400).json({ error })
res.json([])
```

---

## Run it

```bash
npm install
npm start

# Test
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

---

## Next → EP 02: Serialization & Deserialization
