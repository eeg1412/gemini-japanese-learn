import db from '../db/index.js'

export const upsertGrammar = ({ grammar, explanation, structure, example }) => {
  const now = Date.now()

  // Check existence
  const existing = db
    .prepare('SELECT * FROM grammars WHERE grammar = ?')
    .get(grammar)

  if (existing) {
    db.prepare(
      `
      UPDATE grammars 
      SET explanation = @explanation, structure = @structure, example = @example, updated_at = @now
      WHERE grammar = @grammar
    `
    ).run({
      grammar,
      explanation,
      structure,
      example,
      now
    })
    return {
      ...existing,
      explanation,
      structure,
      example,
      updated_at: now
    }
  } else {
    const info = db
      .prepare(
        `
      INSERT INTO grammars (grammar, explanation, structure, example, starred, created_at, updated_at)
      VALUES (@grammar, @explanation, @structure, @example, 0, @now, @now)
    `
      )
      .run({
        grammar,
        explanation,
        structure,
        example,
        now
      })
    return {
      id: info.lastInsertRowid,
      grammar,
      explanation,
      structure,
      example,
      starred: 0,
      created_at: now,
      updated_at: now
    }
  }
}

export const getGrammars = ({
  page = 1,
  limit = 20,
  sortOrder = 'desc',
  filter = 'all',
  offset: explicitOffset = null
}) => {
  const offset =
    explicitOffset !== null ? Number(explicitOffset) : (page - 1) * limit
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
    SELECT * FROM grammars
    ${whereClause}
    ORDER BY starred DESC, updated_at ${order}
    LIMIT ? OFFSET ?
  `
    )
    .all(limit, offset)

  const countResult = db
    .prepare(`SELECT COUNT(*) as count FROM grammars ${whereClause}`)
    .get()

  return {
    data: rows,
    total: countResult.count,
    page: Number(page),
    limit: Number(limit)
  }
}

export const toggleStarGrammar = id => {
  const grammar = db.prepare('SELECT * FROM grammars WHERE id = ?').get(id)
  if (!grammar) return null

  const newStarred = grammar.starred === 1 ? 0 : 1
  db.prepare('UPDATE grammars SET starred = ? WHERE id = ?').run(newStarred, id)
  return { ...grammar, starred: newStarred }
}

export const deleteGrammar = id => {
  const info = db.prepare('DELETE FROM grammars WHERE id = ?').run(id)
  return info.changes > 0
}
