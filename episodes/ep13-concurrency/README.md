# EP 13 — Concurrency & Parallelism

> Node.js is single-threaded but can handle thousands of concurrent requests. Here is how.

---

## What you will learn
- The Node.js event loop
- async/await and the Promise API
- Promise.all vs Promise.allSettled vs Promise.race
- Worker threads for CPU tasks
- Concurrency limits

---

## 1. The Event Loop

Node.js is single-threaded but non-blocking:

```
while (true) {
  1. Execute sync code
  2. Process timers (setTimeout, setInterval)
  3. Process I/O callbacks (DB, file, network)
  4. Process microtasks (Promise callbacks)
  5. Repeat
}
```

This means:
```js
// I/O is non-blocking — the thread handles other requests while waiting
const user = await db.findUser(1)   // thread is free while DB query runs
const file = await fs.readFile(...)  // thread is free while reading disk
```

---

## 2. Promise.all — parallel operations

```js
// ❌ Sequential — 3 seconds
const user  = await getUser(id)     // 1s
const posts = await getPosts(id)    // 1s
const stats = await getStats(id)    // 1s
// Total: 3000ms

// ✅ Parallel — 1 second
const [user, posts, stats] = await Promise.all([
  getUser(id),   // all 3 fire at the same time
  getPosts(id),
  getStats(id),
])
// Total: 1000ms (fastest of the batch)
```

---

## 3. Promise.allSettled — don't fail all

```js
// Promise.all fails if ANY promise rejects
// Promise.allSettled — all resolve regardless

const results = await Promise.allSettled([
  fetchPrimaryDB(),      // might fail
  fetchReplicaDB(),      // backup
  fetchCacheData(),      // might fail
])

results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value)
  if (r.status === 'rejected')  console.log('failed:', r.reason)
})
```

---

## 4. CPU tasks → Worker Threads

```js
const { Worker } = require('worker_threads')

// ❌ CPU-heavy code blocks the event loop — all other requests WAIT
app.get('/hash', (req, res) => {
  const result = computeHeavyHash(data) // blocks for 2s
  res.json({ result })
})

// ✅ Worker thread — runs on a separate OS thread
app.get('/hash', (req, res) => {
  const worker = new Worker('./workers/hash.worker.js', { workerData: { data } })
  worker.on('message', result => res.json({ result }))
  worker.on('error', err => res.status(500).json({ error: err.message }))
})
```

---

## 5. Concurrency limits

```js
// Don't slam downstream services with unlimited parallel requests
async function withConcurrencyLimit(items, limit, fn) {
  const results = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    results.push(...await Promise.all(batch.map(fn)))
  }
  return results
}

// Process 1000 users — max 10 at a time
await withConcurrencyLimit(users, 10, async (user) => {
  await sendEmail(user)
})
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/dashboard   # parallel queries
curl http://localhost:3000/compute/35  # worker thread fibonacci
```

## Next → EP 14: Error Handling & Config
