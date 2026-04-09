const express = require('express')
const app = express()
app.use(express.json())

// Simulating a DB with an in-memory store + ORM-like patterns
// In real projects: use Prisma, Sequelize, Knex, or TypeORM

class Database {
  constructor() { this.tables = { users: [], posts: [] }; this._ids = {} }
  nextId(table) { return (this._ids[table] = (this._ids[table] || 0) + 1) }
  
  async findAll(table, where = {}) {
    return this.tables[table].filter(row =>
      Object.entries(where).every(([k, v]) => row[k] === v)
    )
  }
  async findById(table, id) { return this.tables[table].find(r => r.id === id) || null }
  async create(table, data) {
    const row = { id: this.nextId(table), ...data, createdAt: new Date(), updatedAt: new Date() }
    this.tables[table].push(row)
    return row
  }
  async update(table, id, data) {
    const idx = this.tables[table].findIndex(r => r.id === id)
    if (idx === -1) return null
    this.tables[table][idx] = { ...this.tables[table][idx], ...data, updatedAt: new Date() }
    return this.tables[table][idx]
  }
  async delete(table, id) {
    const idx = this.tables[table].findIndex(r => r.id === id)
    if (idx === -1) return false
    this.tables[table].splice(idx, 1)
    return true
  }
}

const db = new Database()

// Seed data
db.create('users', { name: 'Alice', email: 'alice@example.com' })
db.create('users', { name: 'Bob', email: 'bob@example.com' })

app.get('/users', async (req, res) => res.json({ data: await db.findAll('users') }))
app.get('/users/:id', async (req, res) => {
  const user = await db.findById('users', Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({ data: user })
})
app.post('/users', async (req, res) => {
  const user = await db.create('users', req.body)
  res.status(201).json({ data: user })
})
app.patch('/users/:id', async (req, res) => {
  const user = await db.update('users', Number(req.params.id), req.body)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({ data: user })
})
app.delete('/users/:id', async (req, res) => {
  const ok = await db.delete('users', Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

app.listen(3000, () => console.log('EP06 running on :3000'))
