const express = require('express')
const app = express()
app.use(express.json())

// 1. JSON serialization
app.get('/serialize', (req, res) => {
  const dbRow = { id: 1, first_name: 'John', created_at: new Date(), password_hash: 'secret' }
  // Transform before sending — rename keys, remove sensitive fields
  const dto = {
    id: dbRow.id,
    name: dbRow.first_name,
    createdAt: dbRow.created_at,
    // password_hash is intentionally omitted
  }
  res.json({ data: dto })
})

// 2. Parsing and coercing types
app.post('/coerce', (req, res) => {
  const raw = req.body
  const coerced = {
    age: Number(raw.age),
    isActive: raw.isActive === 'true' || raw.isActive === true,
    tags: Array.isArray(raw.tags) ? raw.tags : [raw.tags],
    createdAt: new Date(raw.createdAt),
  }
  res.json({ raw, coerced })
})

// 3. Handling dates
app.get('/dates', (req, res) => {
  const now = new Date()
  res.json({
    iso: now.toISOString(),       // recommended: "2024-01-15T10:30:00.000Z"
    unix: now.getTime(),          // milliseconds since epoch
    local: now.toLocaleDateString(),
  })
})

// 4. Circular reference issue
app.get('/circular-safe', (req, res) => {
  const obj = { id: 1, name: 'test' }
  // obj.self = obj  <-- this would crash JSON.stringify
  // Use replacer or libraries like flatted for real circular refs
  res.json({ data: obj })
})

app.listen(3000, () => console.log('EP02 running on :3000'))
