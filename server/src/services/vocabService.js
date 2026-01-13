import db from '../db/index.js'

export const upsertVocabulary = ({
  original,
  reading,
  meaning,
  example,
  type
}) => {
  const now = Date.now()

  // Check existence
  const existing = db
    .prepare('SELECT * FROM vocabularies WHERE original = ?')
    .get(original)

  if (existing) {
    db.prepare(
      `
      UPDATE vocabularies 
      SET reading = @reading, meaning = @meaning, example = @example, type = @type, updated_at = @now
      WHERE original = @original
    `
    ).run({ original, reading, meaning, example, type, now })
    return { ...existing, reading, meaning, example, type, updated_at: now }
  } else {
    const info = db
      .prepare(
        `
      INSERT INTO vocabularies (original, reading, meaning, example, type, created_at, updated_at)
      VALUES (@original, @reading, @meaning, @example, @type, @now, @now)
    `
      )
      .run({ original, reading, meaning, example, type, now })
    return {
      id: info.lastInsertRowid,
      original,
      reading,
      meaning,
      example,
      type,
      created_at: now,
      updated_at: now
    }
  }
}

export const getVocabularies = ({
  page = 1,
  limit = 20,
  sortOrder = 'desc'
}) => {
  const offset = (page - 1) * limit
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const rows = db
    .prepare(
      `
    SELECT * FROM vocabularies 
    ORDER BY updated_at ${order}
    LIMIT ? OFFSET ?
  `
    )
    .all(limit, offset)

  const countResult = db
    .prepare('SELECT COUNT(*) as count FROM vocabularies')
    .get()

  return {
    data: rows,
    total: countResult.count,
    page: Number(page),
    limit: Number(limit)
  }
}
