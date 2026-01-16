import express from 'express'
import {
  getVocabularies,
  deleteVocabulary,
  setVocabularyStarred,
  toggleVocabularyStarred
} from '../services/vocabService.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticateToken, (req, res) => {
  try {
    const { page, limit, sort, filter, offset } = req.query
    const result = getVocabularies({
      page,
      limit,
      sortOrder: sort,
      filter: filter || 'all',
      offset: offset !== undefined ? Number(offset) : null
    })
    res.json(result)
  } catch (error) {
    console.error('List vocab error:', error)
    res.status(500).json({ error: 'Failed to fetch vocabulary' })
  }
})

router.patch('/:id/star', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    const { starred } = req.body || {}

    const updated =
      typeof starred === 'boolean'
        ? setVocabularyStarred(id, starred)
        : toggleVocabularyStarred(id)

    if (!updated) {
      return res.status(404).json({ error: 'Vocabulary not found' })
    }
    // updated.conjugations 如果存在，尝试解析为 JSON
    if (updated.conjugations) {
      try {
        updated.conjugations = JSON.parse(updated.conjugations)
      } catch (e) {
        console.error('Failed to parse conjugations JSON:', e)
        updated.conjugations = null
      }
    }
    res.json({ data: updated })
  } catch (error) {
    console.error('Star vocab error:', error)
    res.status(500).json({ error: 'Failed to update vocabulary' })
  }
})

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    deleteVocabulary(id)
    res.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete vocab error:', error)
    res.status(500).json({ error: 'Failed to delete vocabulary' })
  }
})

export default router
