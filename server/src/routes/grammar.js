import express from 'express'
import {
  getGrammars,
  deleteGrammar,
  toggleStarGrammar
} from '../services/grammarService.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticateToken, (req, res) => {
  try {
    const { page, limit, sort, filter } = req.query
    const result = getGrammars({
      page,
      limit,
      sortOrder: sort,
      filter: filter || 'all'
    })
    res.json(result)
  } catch (error) {
    console.error('List grammar error:', error)
    res.status(500).json({ error: 'Failed to fetch grammars' })
  }
})

router.patch('/:id/star', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    // Currently only supporting toggle
    const updated = toggleStarGrammar(id)

    if (!updated) {
      return res.status(404).json({ error: 'Grammar not found' })
    }
    res.json({ data: updated })
  } catch (error) {
    console.error('Star grammar error:', error)
    res.status(500).json({ error: 'Failed to update grammar' })
  }
})

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    deleteGrammar(id)
    res.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete grammar error:', error)
    res.status(500).json({ error: 'Failed to delete grammar' })
  }
})

export default router
