# EP 18 — Testing, Code Quality & 12-Factor App

> Ship with confidence. Test everything that can break.

---

## What you will learn
- Unit tests with Jest
- Integration tests with Supertest
- Test structure (AAA pattern)
- Code quality tools (ESLint, Prettier)
- 12-factor app principles

---

## 1. Types of tests

```
Unit test        → test one function in isolation (fast, no DB)
Integration test → test a full HTTP route (uses real app, in-memory DB)
E2E test         → test the entire system (browser + backend + DB)
```

---

## 2. Jest setup

```bash
npm install --save-dev jest supertest
```

```json
// package.json
"scripts": {
  "test":       "jest --coverage",
  "test:unit":  "jest tests/unit",
  "test:int":   "jest tests/integration"
}
```

---

## 3. Unit test — AAA pattern

```js
// Arrange → Act → Assert
describe('paginate()', () => {
  test('returns correct page', () => {
    // Arrange
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

    // Act
    const result = paginate(items, 2, 10)

    // Assert
    expect(result.data[0].id).toBe(11)
    expect(result.meta.page).toBe(2)
    expect(result.meta.total).toBe(25)
  })
})
```

---

## 4. Integration test with Supertest

```js
const request = require('supertest')
const { app } = require('../../src/app')

describe('POST /users', () => {
  test('creates a user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Bob', email: 'bob@example.com' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: 'Bob' })
  })

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/users').send({ name: 'Bob' })
    expect(res.status).toBe(400)
  })
})
```

---

## 5. What to test

```
✅ Every happy path (valid input → correct output)
✅ Every error case (missing field, not found, conflict)
✅ Edge cases (empty string, zero, null)
✅ Auth — protected routes reject unauthenticated requests
✅ Business rules — e.g. "can't transfer more credits than balance"

❌ Don't test: framework internals, third-party libraries
```

---

## 6. 12-Factor App principles

| # | Factor | In practice |
|---|--------|-------------|
| 1 | Codebase | One repo, many deploys |
| 2 | Dependencies | `package.json`, no globals |
| 3 | Config | Env vars, never in code |
| 4 | Backing services | DB/Redis as attached resources |
| 5 | Build/release/run | Separate stages |
| 6 | Processes | Stateless, share nothing |
| 7 | Port binding | App binds its own port |
| 8 | Concurrency | Scale via process model |
| 9 | Disposability | Fast startup, graceful shutdown |
| 10 | Dev/prod parity | Same stack locally and in prod |
| 11 | Logs | Stream to stdout |
| 12 | Admin processes | One-off tasks as commands |

---

## 7. ESLint + Prettier

```bash
npm install --save-dev eslint prettier eslint-config-prettier
```

```json
// .eslintrc.json
{
  "env": { "node": true, "es2022": true },
  "extends": ["eslint:recommended", "prettier"],
  "rules": { "no-console": "warn", "no-unused-vars": "error" }
}
```

```json
// .prettierrc
{ "semi": false, "singleQuote": true, "tabWidth": 2 }
```

---

## Run tests

```bash
npm install
npm test
# Output shows unit + integration results + coverage report
```

## You finished the series! 🎉
