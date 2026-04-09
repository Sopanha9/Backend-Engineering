const users = [{ id: 1, name: 'John Doe', email: 'john@example.com' }]
let nextId = 2
exports.getAll = (req, res) => res.json({ data: users })
exports.getOne = (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ data: user })
}
exports.create = (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email required' })
  const user = { id: nextId++, name, email }
  users.push(user)
  res.status(201).json({ data: user })
}
exports.update = (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users[idx] = { ...users[idx], ...req.body, id: users[idx].id }
  res.json({ data: users[idx] })
}
exports.remove = (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users.splice(idx, 1)
  res.status(204).send()
}
