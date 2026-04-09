const { Router } = require('express')
const router = Router()

// In-memory store for demo
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
]
let nextId = 3

// GET /api/users
router.get('/', (req, res) => {
  res.json({ data: users })
})

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ data: user })
})

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' })
  const user = { id: nextId++, name, email }
  users.push(user)
  res.status(201).json({ data: user })
})

// PATCH /api/users/:id
router.patch('/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users[idx] = { ...users[idx], ...req.body }
  res.json({ data: users[idx] })
})

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users.splice(idx, 1)
  res.status(204).send()
})

module.exports = router
