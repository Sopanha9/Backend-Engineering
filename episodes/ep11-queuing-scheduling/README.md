# EP 11 — Task Queuing & Scheduling

> Don't make users wait for slow operations. Queue them.

---

## What you will learn
- Why queues exist
- BullMQ + Redis setup
- Workers and processors
- Job retries and failure handling
- Cron job scheduling

---

## 1. Why queues?

```
Without queue: POST /register → send email → wait 2s → response
With queue:    POST /register → queue email job → instant response
               [background worker processes email job]
```

---

## 2. BullMQ setup

```bash
npm install bullmq ioredis
```

```js
const { Queue, Worker } = require('bullmq')
const connection = { host: 'localhost', port: 6379 }

// Producer — add jobs
const emailQueue = new Queue('emails', { connection })
await emailQueue.add('welcome', { to: 'user@example.com', name: 'John' })
await emailQueue.add('reset', { to: 'user@example.com' }, { delay: 5000 }) // 5s delay

// Consumer (Worker) — process jobs
const worker = new Worker('emails', async (job) => {
  if (job.name === 'welcome') await sendWelcomeEmail(job.data)
  if (job.name === 'reset')   await sendResetEmail(job.data)
}, { connection, concurrency: 5 }) // process 5 jobs simultaneously

worker.on('completed', (job) => console.log(`Job ${job.id} done`))
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err))
```

---

## 3. Retries and failure

```js
await emailQueue.add('welcome', data, {
  attempts: 3,               // retry 3 times on failure
  backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s
  removeOnComplete: 100,     // keep last 100 completed
  removeOnFail: 500,         // keep last 500 failed for debugging
})
```

---

## 4. Scheduled jobs (cron)

```js
const { Queue } = require('bullmq')
const reportQueue = new Queue('reports', { connection })

// Run every day at midnight
await reportQueue.add('daily-digest', {}, {
  repeat: { cron: '0 0 * * *' }
})

// Run every hour
await reportQueue.add('cleanup', {}, {
  repeat: { every: 3600000 } // ms
})
```

---

## 5. Job types

```
Fire-and-forget  → add job, don't wait for result
Delayed          → run after N milliseconds
Scheduled        → cron expression
Priority         → high priority jobs processed first
```

---

## Run it

```bash
npm install && npm start
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
curl http://localhost:3000/jobs
```

## Next → EP 12: Elasticsearch
