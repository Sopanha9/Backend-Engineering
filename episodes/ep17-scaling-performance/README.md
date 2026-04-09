# EP 17 — Scaling, Performance & Graceful Shutdown

> Take your app from single-process to production-ready.

---

## What you will learn
- Node.js cluster module (multi-core)
- Graceful shutdown (SIGTERM/SIGINT)
- Response compression
- HTTP keep-alive tuning
- Performance profiling basics

---

## 1. The problem: Node is single-threaded

```
Single process → uses 1 CPU core → wastes 7 cores on 8-core machine

Solution: Cluster module → 1 process per CPU core
```

---

## 2. Cluster module

```js
const cluster = require('cluster')
const os = require('os')

if (cluster.isPrimary) {
  // Fork one worker per CPU
  for (let i = 0; i < os.cpus().length; i++) cluster.fork()

  // Restart crashed workers
  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died — restarting`)
    cluster.fork()
  })
} else {
  // Each worker runs the Express app
  const app = require('./app')
  app.listen(3000)
}
```

---

## 3. Graceful shutdown

```js
// When deployment kills your app, finish in-flight requests first
const shutdown = () => {
  console.log('Shutting down...')
  server.close(() => {
    // close DB connections, flush logs, etc.
    db.end()
    process.exit(0)
  })
  // Force exit after 30s if requests don't finish
  setTimeout(() => process.exit(1), 30_000)
}

process.on('SIGTERM', shutdown) // Docker/Kubernetes sends this
process.on('SIGINT',  shutdown) // Ctrl+C sends this
```

---

## 4. Compression

```bash
npm install compression
```

```js
const compression = require('compression')
app.use(compression()) // gzip responses — reduces bandwidth 60-80%
```

---

## 5. Performance checklist

```
✅ Use cluster or PM2 (multi-core)
✅ Enable gzip compression
✅ Set Cache-Control headers on static data
✅ Use connection pooling for DB
✅ Index frequently queried DB columns
✅ Use caching (EP08) for repeated reads
✅ Avoid synchronous/blocking code
✅ Profile with: node --prof app.js
```

---

## 6. PM2 (production process manager)

```bash
npm install -g pm2

pm2 start src/index.js --name "myapp" -i max  # cluster mode, max cores
pm2 restart myapp
pm2 logs myapp
pm2 monit          # live dashboard
```

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
  }]
}
```

---

## Run it

```bash
npm install && node src/index.js
curl http://localhost:3000/health
```

## Next → EP 18: Testing & Code Quality
