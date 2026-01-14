import db from '../db/index.js'

export const upsertVocabulary = ({
  original,
  reading,
  meaning,
  example,
  type,
  verb_category,
  conjugations
}) => {
  const now = Date.now()
  const conjugationsStr = conjugations ? JSON.stringify(conjugations) : null

  // Check existence
  const existing = db
    .prepare('SELECT * FROM vocabularies WHERE original = ?')
    .get(original)

  if (existing) {
    db.prepare(
      `
      UPDATE vocabularies 
      SET reading = @reading, meaning = @meaning, example = @example, type = @type, 
          verb_category = @verb_category, conjugations = @conjugationsStr, updated_at = @now
      WHERE original = @original
    `
    ).run({
      original,
      reading,
      meaning,
      example,
      type,
      verb_category,
      conjugationsStr,
      now
    })
    return {
      ...existing,
      reading,
      meaning,
      example,
      type,
      verb_category,
      conjugations,
      updated_at: now
    }
  } else {
    const info = db
      .prepare(
        `
      INSERT INTO vocabularies (original, reading, meaning, example, type, verb_category, conjugations, starred, created_at, updated_at)
      VALUES (@original, @reading, @meaning, @example, @type, @verb_category, @conjugationsStr, 0, @now, @now)
    `
      )
      .run({
        original,
        reading,
        meaning,
        example,
        type,
        verb_category,
        conjugationsStr,
        now
      })
    return {
      id: info.lastInsertRowid,
      original,
      reading,
      meaning,
      example,
      type,
      verb_category,
      conjugations,
      starred: 0,
      created_at: now,
      updated_at: now
    }
  }
}

export const getVocabularies = ({
  page = 1,
  limit = 20,
  sortOrder = 'desc',
  filter = 'all'
}) => {
  const offset = (page - 1) * limit
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  let whereClause = ''
  if (filter === 'starred') {
    whereClause = 'WHERE starred = 1'
  } else if (filter === 'unstarred') {
    whereClause = 'WHERE starred = 0'
  }

  const rows = db
    .prepare(
      `
    SELECT * FROM vocabularies 
    ${whereClause}
    ORDER BY starred DESC, updated_at ${order}
    LIMIT ? OFFSET ?
  `
    )
    .all(limit, offset)

  // Parse conjugations JSON
  const parsedRows = rows.map(row => ({
    ...row,
    conjugations: row.conjugations ? JSON.parse(row.conjugations) : null
  }))

  const countResult = db
    .prepare(`SELECT COUNT(*) as count FROM vocabularies ${whereClause}`)
    .get()

  return {
    data: parsedRows,
    total: countResult.count,
    page: Number(page),
    limit: Number(limit)
  }
}

export const setVocabularyStarred = (id, starred) => {
  const info = db
    .prepare('UPDATE vocabularies SET starred = ? WHERE id = ?')
    .run(starred ? 1 : 0, id)
  if (info.changes === 0) return null
  return db.prepare('SELECT * FROM vocabularies WHERE id = ?').get(id)
}

export const toggleVocabularyStarred = id => {
  const row = db
    .prepare('SELECT starred FROM vocabularies WHERE id = ?')
    .get(id)
  if (!row) return null
  const next = row.starred ? 0 : 1
  db.prepare('UPDATE vocabularies SET starred = ? WHERE id = ?').run(next, id)
  return db.prepare('SELECT * FROM vocabularies WHERE id = ?').get(id)
}

export const deleteVocabulary = id => {
  return db.prepare('DELETE FROM vocabularies WHERE id = ?').run(id)
}
