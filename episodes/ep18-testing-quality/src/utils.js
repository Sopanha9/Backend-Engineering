exports.paginate = (items, page = 1, limit = 10) => {
  const p = Math.max(1, Number(page))
  const l = Math.min(100, Math.max(1, Number(limit)))
  return {
    data: items.slice((p - 1) * l, p * l),
    meta: { page: p, limit: l, total: items.length, pages: Math.ceil(items.length / l) }
  }
}

exports.toUserDTO = (user) => {
  const { passwordHash, internalNotes, ...dto } = user
  return dto
}

exports.isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email)
