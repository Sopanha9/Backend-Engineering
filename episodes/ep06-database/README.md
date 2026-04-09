# EP 06 — Database Fundamentals

> Connect your Express app to a real database.

---

## What you will learn
- SQL basics (queries, joins, indexes)
- ORM vs raw queries — when to use each
- Migrations — evolving your schema safely
- Connection pooling
- N+1 query problem

---

## 1. Why a database?

```
In-memory array  → lost on restart, not shared between instances
Database         → persisted, shared, queryable, scalable
```

---

## 2. Popular choices for Node.js

| Tool | Type | Use when |
|---|---|---|
| **Prisma** | ORM | New projects, type safety |
| **Sequelize** | ORM | Legacy Node projects |
| **Knex** | Query builder | Need raw SQL + JS |
| **pg / mysql2** | Driver | Full control, performance |

---

## 3. Prisma setup (recommended)

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int    @id @default(autoincrement())
  title     String
  userId    Int
  user      User   @relation(fields: [userId], references: [id])
}
```

```bash
npx prisma migrate dev --name init  # create migration
npx prisma generate                  # generate client
```

---

## 4. Prisma queries

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Find all
const users = await prisma.user.findMany()

// Find with filter
const admins = await prisma.user.findMany({ where: { role: 'admin' } })

// Find one
const user = await prisma.user.findUnique({ where: { id: 1 } })

// Create
const user = await prisma.user.create({ data: { name: 'John', email: 'john@test.com' } })

// Update
const user = await prisma.user.update({ where: { id: 1 }, data: { name: 'Jane' } })

// Delete
await prisma.user.delete({ where: { id: 1 } })

// With relations (avoid N+1)
const users = await prisma.user.findMany({ include: { posts: true } })
```

---

## 5. N+1 problem

```js
// ❌ N+1 — 1 query for users + 1 query per user for posts
const users = await prisma.user.findMany()
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { userId: user.id } })
}

// ✅ 1 query with JOIN
const users = await prisma.user.findMany({ include: { posts: true } })
```

---

## 6. Migrations

```bash
# Create a migration when schema changes
npx prisma migrate dev --name add_role_to_users

# Apply migrations in production
npx prisma migrate deploy
```

---

## Run it

```bash
npm install && npm start
curl http://localhost:3000/users
```

---

## Next → EP 07: Business Logic Layer (BLL)
