const express = require('express')
const app = express()
app.use(express.json())

// --- Service Layer (Business Logic) ---
const UserService = {
  users: [{ id: 1, name: 'Alice', email: 'alice@example.com', credits: 100 }],
  nextId: 2,

  async register(data) {
    if (!data.email || !data.name) throw new Error('name and email required')
    if (this.users.find(u => u.email === data.email)) throw new Error('Email already registered')
    // Business rule: new users get 50 free credits
    const user = { id: this.nextId++, ...data, credits: 50, createdAt: new Date() }
    this.users.push(user)
    // Could also: send welcome email, notify Slack, create free subscription, etc.
    return user
  },

  async transferCredits(fromId, toId, amount) {
    const from = this.users.find(u => u.id === fromId)
    const to   = this.users.find(u => u.id === toId)
    if (!from || !to) throw new Error('User not found')
    if (amount <= 0) throw new Error('Amount must be positive')
    if (from.credits < amount) throw new Error('Insufficient credits')
    // Transaction — both must succeed or neither
    from.credits -= amount
    to.credits   += amount
    return { from, to, amount }
  },

  async getAll() { return this.users }
}

// --- Controller (thin HTTP layer) ---
app.get('/users', async (req, res) => {
  res.json({ data: await UserService.getAll() })
})

app.post('/users', async (req, res) => {
  try {
    const user = await UserService.register(req.body)
    res.status(201).json({ data: user })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/users/transfer', async (req, res) => {
  const { fromId, toId, amount } = req.body
  try {
    const result = await UserService.transferCredits(Number(fromId), Number(toId), Number(amount))
    res.json({ data: result })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.listen(3000, () => console.log('EP07 running on :3000'))
