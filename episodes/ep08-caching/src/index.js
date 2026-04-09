const express = require('express')
const app = express()
app.use(express.json())

// Simple in-memory cache (use Redis in production)
class Cache {
  constructor() { this.store = new Map() }
  set(key, value, ttlSeconds = 60) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }
  get(key) {
    const item = this.store.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) { this.store.delete(key); return null }
    return item.value
  }
  del(key) { this.store.delete(key) }
  delPattern(prefix) {
    for (const key of this.store.keys()) { if (key.startsWith(prefix)) this.store.delete(key) }
  }
}
const cache = new Cache()

// Simulate slow DB
const slowDB = async (id) => {
  await new Promise(r => setTimeout(r, 500)) // 500ms delay
  return { id, name: `User ${id}`, email: `user${id}@example.com` }
}

// Cache-aside pattern
app.get('/users/:id', async (req, res) => {
  const key = `user:${req.params.id}`
  const cached = cache.get(key)
  if (cached) {
    return res.json({ data: cached, source: 'cache' })
  }
  const user = await slowDB(req.params.id)
  cache.set(key, user, 30) // cache for 30 seconds
  res.json({ data: user, source: 'db' })
})

// Invalidate on update
app.patch('/users/:id', async (req, res) => {
  cache.del(`user:${req.params.id}`) // bust cache on update
  res.json({ data: { id: req.params.id, ...req.body } })
})

app.listen(3000, () => console.log('EP08 running on :3000'))
