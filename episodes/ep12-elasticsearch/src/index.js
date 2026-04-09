const express = require('express')
const app = express()
app.use(express.json())

// Simulating Elasticsearch with in-memory full-text search
// In production: use @elastic/elasticsearch client
const documents = [
  { id: '1', title: 'Node.js Best Practices', content: 'Learn how to build scalable Node.js applications with Express', tags: ['nodejs', 'backend'] },
  { id: '2', title: 'Redis Caching Guide', content: 'How to use Redis for caching in your backend applications', tags: ['redis', 'caching', 'backend'] },
  { id: '3', title: 'REST API Design', content: 'Design clean and consistent REST APIs with proper HTTP methods and status codes', tags: ['api', 'rest', 'design'] },
  { id: '4', title: 'Docker for Developers', content: 'Containerize your Node.js application with Docker', tags: ['docker', 'devops', 'nodejs'] },
]

function search(query, filters = {}) {
  const q = query.toLowerCase()
  return documents.filter(doc => {
    const matchesQuery = !q || [doc.title, doc.content, ...doc.tags].some(f => f.toLowerCase().includes(q))
    const matchesTag = !filters.tag || doc.tags.includes(filters.tag)
    return matchesQuery && matchesTag
  }).map(doc => ({
    ...doc,
    score: [doc.title, doc.content].filter(f => f.toLowerCase().includes(q)).length,
  })).sort((a, b) => b.score - a.score)
}

app.get('/search', (req, res) => {
  const { q = '', tag } = req.query
  const results = search(q, { tag })
  res.json({ data: results, meta: { query: q, total: results.length } })
})

app.post('/index', (req, res) => {
  const doc = { id: String(Date.now()), ...req.body }
  documents.push(doc)
  res.status(201).json({ data: doc, message: 'Document indexed' })
})

app.listen(3000, () => console.log('EP12 running on :3000'))
