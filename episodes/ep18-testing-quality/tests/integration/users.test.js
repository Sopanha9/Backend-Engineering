const request = require('supertest')
const { app, users } = require('../../src/app')

beforeEach(() => {
  // Reset users array before each test
  users.length = 0
  users.push({ id: 1, name: 'Alice', email: 'alice@example.com' })
})

describe('GET /users', () => {
  test('returns list of users', async () => {
    const res = await request(app).get('/users')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeInstanceOf(Array)
    expect(res.body.data).toHaveLength(1)
  })
})

describe('GET /users/:id', () => {
  test('returns user by id', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Alice')
  })

  test('returns 404 for missing user', async () => {
    const res = await request(app).get('/users/9999')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })
})

describe('POST /users', () => {
  test('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Bob', email: 'bob@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: 'Bob', email: 'bob@example.com' })
    expect(res.body.data).toHaveProperty('id')
  })

  test('returns 400 if name or email missing', async () => {
    const res = await request(app).post('/users').send({ name: 'Bob' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  test('returns 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Dupe', email: 'alice@example.com' })
    expect(res.status).toBe(409)
  })
})

describe('DELETE /users/:id', () => {
  test('deletes a user and returns 204', async () => {
    const res = await request(app).delete('/users/1')
    expect(res.status).toBe(204)
  })

  test('returns 404 when deleting non-existent user', async () => {
    const res = await request(app).delete('/users/9999')
    expect(res.status).toBe(404)
  })
})
