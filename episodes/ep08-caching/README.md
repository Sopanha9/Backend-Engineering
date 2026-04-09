# EP 08 — Caching

> Make your app 100x faster without touching the database.

---

## What you will learn
- Why caching matters
- Cache-aside pattern
- TTL (time to live)
- Cache invalidation
- Redis setup

---

## 1. Why cache?

```
Without cache: every request → DB query → 200-500ms
With cache:    cache hit     → memory   → 1-5ms
```

---

## 2. Cache-aside pattern

```js
// 1. Check cache first
const cached = await redis.get(`user:${id}`)
if (cached) return JSON.parse(cached)

// 2. Cache miss → query DB
const user = await db.user.findUnique({ where: { id } })

// 3. Store in cache with TTL
await redis.setEx(`user:${id}`, 60, JSON.stringify(user)) // 60s TTL

return user
```

---

## 3. Redis setup

```bash
npm install ioredis
```

```js
const Redis = require('ioredis')
const redis = new Redis({ host: 'localhost', port: 6379 })

// Set with TTL
await redis.setEx('key', 60, JSON.stringify(data))

// Get
const raw = await redis.get('key')
const data = raw ? JSON.parse(raw) : null

// Delete
await redis.del('key')

// Delete by pattern
const keys = await redis.keys('user:*')
if (keys.length) await redis.del(...keys)
```

---

## 4. Cache invalidation strategies

```js
// 1. TTL-based — auto-expire after N seconds
await redis.setEx(key, 300, data) // expires in 5 min

// 2. Event-based — delete on mutation
app.patch('/users/:id', async (req, res) => {
  await updateUser(req.params.id, req.body)
  await redis.del(`user:${req.params.id}`) // bust cache
})

// 3. Write-through — update cache when writing
app.patch('/users/:id', async (req, res) => {
  const updated = await updateUser(req.params.id, req.body)
  await redis.setEx(`user:${req.params.id}`, 300, JSON.stringify(updated))
})
```

---

## 5. What to cache

```
✅ Cache:  user profiles, product listings, config, aggregated stats
❌ Don't:  passwords, tokens, real-time data, per-request state
```

---

## Run it

```bash
npm install && npm start
# First call — slow (DB)
curl http://localhost:3000/users/1
# Second call — fast (cache)
curl http://localhost:3000/users/1
```

## Next → EP 09: Object Storage & Large Files
