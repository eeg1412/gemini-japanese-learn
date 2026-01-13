import express from 'express'
import { getVocabularies } from '../services/vocabService.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticateToken, (req, res) => {
  try {
    const { page, limit, sort } = req.query
    const result = getVocabularies({ page, limit, sortOrder: sort })
    res.json(result)
  } catch (error) {
    console.error('List vocab error:', error)
    res.status(500).json({ error: 'Failed to fetch vocabulary' })
  }
})

export default router
