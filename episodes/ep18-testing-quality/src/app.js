const express = require('express')
const app = express()
app.use(express.json())

const users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }]
let nextId = 2

app.get('/users', (req, res) => res.json({ data: users }))

app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ data: user })
})

app.post('/users', (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email required' })
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email taken' })
  const user = { id: nextId++, name, email }
  users.push(user)
  res.status(201).json({ data: user })
})

app.delete('/users/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users.splice(idx, 1)
  res.status(204).send()
})

module.exports = { app, users }
