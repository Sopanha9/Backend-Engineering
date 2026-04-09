const { paginate, toUserDTO, isValidEmail } = require('../../src/utils')

describe('paginate()', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))

  test('returns first page by default', () => {
    const result = paginate(items)
    expect(result.data).toHaveLength(10)
    expect(result.data[0].id).toBe(1)
    expect(result.meta.total).toBe(25)
    expect(result.meta.pages).toBe(3)
  })

  test('returns correct page', () => {
    const result = paginate(items, 2, 10)
    expect(result.data[0].id).toBe(11)
    expect(result.meta.page).toBe(2)
  })

  test('caps limit at 100', () => {
    const result = paginate(items, 1, 999)
    expect(result.meta.limit).toBe(100)
  })

  test('returns empty array for out-of-range page', () => {
    const result = paginate(items, 100, 10)
    expect(result.data).toHaveLength(0)
  })
})

describe('toUserDTO()', () => {
  test('removes sensitive fields', () => {
    const user = { id: 1, name: 'Alice', email: 'a@a.com', passwordHash: 'abc', internalNotes: 'vip' }
    const dto = toUserDTO(user)
    expect(dto).not.toHaveProperty('passwordHash')
    expect(dto).not.toHaveProperty('internalNotes')
    expect(dto).toHaveProperty('name', 'Alice')
  })
})

describe('isValidEmail()', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('a+b@sub.domain.io')).toBe(true)
  })
  test('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@missing.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
