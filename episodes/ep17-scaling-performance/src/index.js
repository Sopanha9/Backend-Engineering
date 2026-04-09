const cluster = require('cluster')
const os = require('os')
const express = require('express')

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length
  console.log(`Primary ${process.pid} running — forking ${numCPUs} workers`)
  for (let i = 0; i < numCPUs; i++) cluster.fork()
  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died (code ${code}) — restarting`)
    cluster.fork()
  })
} else {
  const app = express()
  app.use(express.json())

  // Graceful shutdown
  let isShuttingDown = false
  const shutdown = (signal) => {
    if (isShuttingDown) return
    isShuttingDown = true
    console.log(`Worker ${process.pid} received ${signal} — shutting down gracefully`)
    server.close(() => {
      console.log(`Worker ${process.pid} closed all connections`)
      process.exit(0)
    })
    // Force exit after 30s
    setTimeout(() => { console.log('Forcing exit'); process.exit(1) }, 30000)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  // Health check (reject new requests during shutdown)
  app.use((req, res, next) => {
    if (isShuttingDown) return res.status(503).json({ error: 'Server shutting down' })
    next()
  })

  // Performance: compression middleware simulation
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=300') // 5 min client cache
    next()
  })

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', pid: process.pid, uptime: process.uptime() })
  })

  app.get('/users', (req, res) => {
    res.json({ data: [{ id: 1, name: 'Alice' }], worker: process.pid })
  })

  // Simulate slow route without blocking
  app.get('/slow', async (req, res) => {
    await new Promise(r => setTimeout(r, 1000))
    res.json({ message: 'Done after 1s', pid: process.pid })
  })

  const server = app.listen(3000, () =>
    console.log(`Worker ${process.pid} listening on :3000`)
  )

  // Keep-alive timeout larger than load balancer timeout
  server.keepAliveTimeout = 65000
  server.headersTimeout = 66000
}
