const express = require('express')
const app = express()
app.use(express.json())

// Simple in-memory queue (use BullMQ + Redis in production)
class Queue {
  constructor(name) {
    this.name = name
    this.jobs = []
    this.processors = {}
    this.jobId = 0
  }
  add(jobName, data, opts = {}) {
    const job = { id: ++this.jobId, name: jobName, data, status: 'waiting', createdAt: new Date(), delay: opts.delay || 0, attempts: 0 }
    this.jobs.push(job)
    console.log(`[Queue:${this.name}] Job added: ${jobName} #${job.id}`)
    setTimeout(() => this._process(job), job.delay)
    return job
  }
  process(jobName, handler) { this.processors[jobName] = handler }
  async _process(job) {
    const handler = this.processors[job.name]
    if (!handler) return
    job.status = 'active'; job.attempts++
    try {
      await handler(job)
      job.status = 'completed'
      console.log(`[Queue:${this.name}] Job completed: ${job.name} #${job.id}`)
    } catch (err) {
      job.status = 'failed'; job.error = err.message
      console.log(`[Queue:${this.name}] Job failed: ${job.name} #${job.id} — ${err.message}`)
    }
  }
  getJobs() { return this.jobs }
}

const emailQueue = new Queue('emails')
const reportQueue = new Queue('reports')

// Register workers
emailQueue.process('welcome', async (job) => {
  await new Promise(r => setTimeout(r, 100)) // simulate sending email
  console.log(`Welcome email sent to ${job.data.email}`)
})

emailQueue.process('password-reset', async (job) => {
  console.log(`Reset email sent to ${job.data.email} with token ${job.data.token}`)
})

reportQueue.process('generate', async (job) => {
  await new Promise(r => setTimeout(r, 500))
  console.log(`Report generated for user ${job.data.userId}`)
})

// Simple cron-like scheduler
const scheduledJobs = []
function schedule(name, intervalMs, fn) {
  scheduledJobs.push({ name, intervalMs, fn })
  setInterval(fn, intervalMs)
  console.log(`[Scheduler] ${name} scheduled every ${intervalMs}ms`)
}
schedule('cleanup-expired-sessions', 60000, () => console.log('[Cron] Cleaning up expired sessions...'))
schedule('send-daily-digest', 86400000, () => console.log('[Cron] Sending daily digest emails...'))

// Routes
app.post('/users', (req, res) => {
  const user = { id: Date.now(), ...req.body }
  emailQueue.add('welcome', { email: user.email, name: user.name })
  res.status(201).json({ data: user, message: 'Welcome email queued' })
})

app.post('/auth/forgot-password', (req, res) => {
  const token = Math.random().toString(36).slice(2)
  emailQueue.add('password-reset', { email: req.body.email, token }, { delay: 0 })
  res.json({ message: 'Reset email queued' })
})

app.post('/reports', (req, res) => {
  const job = reportQueue.add('generate', { userId: req.body.userId })
  res.json({ jobId: job.id, message: 'Report generation started' })
})

app.get('/jobs', (req, res) => {
  res.json({ emailJobs: emailQueue.getJobs(), reportJobs: reportQueue.getJobs() })
})

app.listen(3000, () => console.log('EP11 running on :3000'))
