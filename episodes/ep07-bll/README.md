# EP 07 — Business Logic Layer (BLL)

> Keep your controllers thin and your services smart.

---

## What you will learn
- Why to separate business logic from HTTP handling
- Service pattern
- Where business rules live
- Testability

---

## 1. The problem with fat controllers

```js
// ❌ Fat controller — business logic everywhere
app.post('/users/register', async (req, res) => {
  // validation, DB queries, email sending, credit assignment...
  // all mixed together = impossible to test, reuse, or maintain
})
```

---

## 2. Three-layer architecture

```
Controller  → handles HTTP (req/res), nothing else
Service     → business rules, orchestration
Repository  → data access (DB queries)
```

---

## 3. Service example

```js
// services/user.service.js
class UserService {
  async register(data) {
    // Business rules here, not in controller
    if (await this.emailExists(data.email)) throw new Error('Email taken')
    const user = await userRepo.create({ ...data, credits: 50 }) // new users get 50 credits
    await emailService.sendWelcome(user.email)
    return user
  }

  async transferCredits(fromId, toId, amount) {
    const from = await userRepo.findById(fromId)
    if (from.credits < amount) throw new Error('Insufficient credits')
    // Both operations in a transaction
    await db.transaction(async (tx) => {
      await userRepo.decrementCredits(fromId, amount, tx)
      await userRepo.incrementCredits(toId, amount, tx)
    })
  }
}
```

---

## 4. Controller calls service

```js
// controllers/user.controller.js
exports.register = async (req, res) => {
  try {
    const user = await userService.register(req.body) // delegate
    res.status(201).json({ data: user })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
```

---

## 5. Why this matters

```
Testing: test business rules without HTTP
Reuse:   same service used in REST API, CLI, cron job
Clarity: controller = plumbing, service = brains
```

---

## Run it

```bash
npm install && npm start
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@example.com"}'
curl -X POST http://localhost:3000/users/transfer \
  -H "Content-Type: application/json" \
  -d '{"fromId":1,"toId":2,"amount":30}'
```

## Next → EP 08: Caching
