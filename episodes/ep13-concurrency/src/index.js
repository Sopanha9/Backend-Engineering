const express = require('express')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const app = express()
app.use(express.json())

// 1. Promise.all — parallel async operations
app.get('/dashboard', async (req, res) => {
  const start = Date.now()
  
  const delay = (ms, val) => new Promise(r => setTimeout(() => r(val), ms))
  
  // ❌ Sequential: 3 seconds total
  // const user    = await delay(1000, { id: 1, name: 'Alice' })
  // const posts   = await delay(1000, [{ id: 1, title: 'Post 1' }])
  // const notifs  = await delay(1000, [{ id: 1, msg: 'Welcome' }])

  // ✅ Parallel: ~1 second total
  const [user, posts, notifications] = await Promise.all([
    delay(1000, { id: 1, name: 'Alice' }),
    delay(1000, [{ id: 1, title: 'Post 1' }]),
    delay(1000, [{ id: 1, msg: 'Welcome!' }]),
  ])
  
  res.json({ user, posts, notifications, took: `${Date.now() - start}ms` })
})

// 2. Promise.allSettled — don't fail all if one fails
app.get('/resilient', async (req, res) => {
  const delay = (ms, val, fail = false) => new Promise((r, j) => setTimeout(() => fail ? j(new Error('Failed')) : r(val), ms))

  const results = await Promise.allSettled([
    delay(100, { id: 1 }),
    delay(100, null, true), // this one fails
    delay(100, { id: 3 }),
  ])

  const data = results.map(r => r.status === 'fulfilled' ? r.value : null)
  res.json({ data })
})

// 3. CPU-intensive task in worker thread (doesn't block event loop)
app.get('/compute/:n', (req, res) => {
  const n = Number(req.params.n)
  
  // ❌ This blocks the event loop
  // const result = fibonacci(n)
  
  // ✅ Offload to worker thread
  const code = `
    const { workerData, parentPort } = require('worker_threads')
    function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2) }
    parentPort.postMessage(fib(workerData.n))
  `
  const worker = new Worker(code, { eval: true, workerData: { n } })
  worker.on('message', result => res.json({ n, result, thread: 'worker' }))
  worker.on('error', err => res.status(500).json({ error: err.message }))
})

// 4. Concurrency limit — don't overwhelm downstream services
async function withConcurrencyLimit(tasks, limit) {
  const results = []
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit)
    results.push(...await Promise.all(batch.map(t => t())))
  }
  return results
}

app.get('/batch', async (req, res) => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const tasks = ids.map(id => () => new Promise(r => setTimeout(() => r({ id }), 100)))
  const results = await withConcurrencyLimit(tasks, 3) // 3 at a time
  res.json({ data: results })
})

app.listen(3000, () => console.log('EP13 running on :3000'))
