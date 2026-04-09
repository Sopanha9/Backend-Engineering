const express = require('express')
const routes = require('./routes')

const app = express()

app.use(express.json())
app.use('/api', routes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

module.exports = app
