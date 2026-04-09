# EP 02 — Serialization & Deserialization

> Transform data between the wire, your app, and the database safely.

---

## What you will learn
- What serialization and deserialization mean
- How to shape API responses (DTOs)
- Type coercion pitfalls in JavaScript
- Handling dates correctly
- Never expose internal fields to clients

---

## 1. What is Serialization?

**Serialization** = converting an object → a transmittable format (JSON string)  
**Deserialization** = converting a received format → a usable object

```
JS Object  ──serialize──►   JSON string  ──► sent over HTTP
JSON string ──deserialize──► JS Object   ──► used in your code
```

```js
// Serialization
const obj = { name: 'John', age: 30 }
const json = JSON.stringify(obj)  // '{"name":"John","age":30}'

// Deserialization
const parsed = JSON.parse(json)   // { name: 'John', age: 30 }

// Express does this automatically:
// req.body  → express.json() deserializes the incoming JSON
// res.json() → serializes your object back to JSON
```

---

## 2. DTO — Data Transfer Object

Never return raw database rows to the client. Use a DTO to control exactly what goes out.

```js
// ❌ Raw DB row — leaks internal fields!
app.get('/users/:id', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id])
  res.json(user)  // sends password_hash, internal_notes, etc.!
})

// ✅ DTO — only expose what the client needs
function toUserDTO(dbRow) {
  return {
    id: dbRow.id,
    name: dbRow.first_name + ' ' + dbRow.last_name,
    email: dbRow.email,
    createdAt: dbRow.created_at,
    // password_hash → intentionally excluded
    // internal_notes → intentionally excluded
  }
}

app.get('/users/:id', async (req, res) => {
  const user = await db.query(...)
  res.json({ data: toUserDTO(user) })
})
```

---

## 3. Type coercion — the silent killer

JavaScript is loosely typed. Data coming from HTTP is always strings unless you coerce.

```js
// Query strings are always strings
req.query.page   // '2'  not  2
req.query.limit  // '10' not  10

// Body booleans from form data
req.body.isActive  // 'true'  not  true

// Fix: always coerce explicitly
const page    = Number(req.query.page) || 1
const limit   = Math.min(Number(req.query.limit) || 20, 100)
const isActive = req.body.isActive === 'true' || req.body.isActive === true
```

---

## 4. Dates — always use ISO 8601

```js
// ❌ Inconsistent formats
{ "date": "15/01/2024" }    // ambiguous
{ "date": "Jan 15 2024" }   // locale-dependent

// ✅ ISO 8601 — universal, sortable, unambiguous
{ "date": "2024-01-15T10:30:00.000Z" }

// In code:
new Date().toISOString()  // always ISO 8601
```

---

## 5. JSON.stringify gotchas

```js
// undefined values are dropped silently
JSON.stringify({ a: 1, b: undefined })  // '{"a":1}'

// Dates become strings
JSON.stringify({ d: new Date() })  // '{"d":"2024-01-15T..."}'

// Circular references crash
const obj = {}
obj.self = obj
JSON.stringify(obj)  // TypeError: circular structure

// Functions are dropped
JSON.stringify({ fn: () => {} })  // '{}'
```

---

## Run it

```bash
npm install && npm start

curl http://localhost:3000/serialize
curl -X POST http://localhost:3000/coerce \
  -H "Content-Type: application/json" \
  -d '{"age":"25","isActive":"true","tags":"node"}'
```

---

## Next → EP 03: Middleware, Validation & Transformation
