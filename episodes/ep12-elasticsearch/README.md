# EP 12 — Elasticsearch & Full-Text Search

> Let users search anything instantly.

---

## What you will learn
- Why dedicated search engines exist
- Elasticsearch concepts (index, document, mapping)
- Full-text search queries
- Fuzzy search and relevance scoring
- When to use DB search vs Elasticsearch

---

## 1. Why Elasticsearch?

```
SQL LIKE %query%  → slow, no relevance, no typo-tolerance
Elasticsearch     → fast, ranked results, typo-tolerance, synonyms
```

---

## 2. Key concepts

```
Index    → like a table in SQL
Document → like a row (JSON)
Mapping  → like a schema (field types)
Shard    → horizontal partition for scale
```

---

## 3. Setup

```bash
npm install @elastic/elasticsearch
```

```js
const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })

// Create index with mapping
await client.indices.create({
  index: 'posts',
  mappings: {
    properties: {
      title:   { type: 'text', analyzer: 'english' },
      content: { type: 'text', analyzer: 'english' },
      tags:    { type: 'keyword' },
      createdAt: { type: 'date' }
    }
  }
})
```

---

## 4. Index and search

```js
// Index a document
await client.index({
  index: 'posts',
  id: post.id,
  document: { title: post.title, content: post.content, tags: post.tags }
})

// Full-text search
const result = await client.search({
  index: 'posts',
  query: {
    multi_match: {
      query: 'nodejs express',
      fields: ['title^3', 'content'], // title boosted 3x
      fuzziness: 'AUTO' // typo tolerance
    }
  }
})

const hits = result.hits.hits.map(h => ({ id: h._id, ...h._source, score: h._score }))
```

---

## 5. Sync strategy

```
Write to DB → trigger event → sync to Elasticsearch
```

```js
// After creating a post in your DB
const post = await prisma.post.create({ data })
await elasticsearchClient.index({ index: 'posts', id: post.id, document: post })
// Or use a queue (EP11) to sync asynchronously
await searchSyncQueue.add('sync-post', { postId: post.id })
```

---

## Run it

```bash
npm install && npm start
curl "http://localhost:3000/search?q=nodejs"
curl "http://localhost:3000/search?q=caching&tag=backend"
```

## Next → EP 13: Concurrency & Parallelism
