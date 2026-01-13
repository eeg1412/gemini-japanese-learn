import express from 'express'
import { processChat, getChatHistory } from '../services/geminiService.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message, image, customPrompt } = req.body
    if (!message && !image) {
      return res.status(400).json({ error: 'Message or image required' })
    }
    const response = await processChat(
      message || 'Image analysis',
      image,
      customPrompt
    )
    res.json({ response })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/history', authenticateToken, (req, res) => {
  try {
    const { page, limit } = req.query
    const history = getChatHistory(Number(page), Number(limit))
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
