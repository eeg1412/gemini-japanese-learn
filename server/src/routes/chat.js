import express from 'express'
import { processChat, getChatHistory } from '../services/geminiService.js'
import { authenticateToken } from '../middleware/auth.js'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import { getSecret } from '../config/secret.js'
import { fileURLToPath } from 'url'
import db from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

router.get('/image-token', authenticateToken, (req, res) => {
  try {
    // Generate a short-lived token specifically for image access
    const imageToken = jwt.sign(
      { id: req.user.id, purpose: 'image_access' },
      getSecret(),
      { expiresIn: '1h' }
    )
    res.json({ imageToken })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message, image, customPrompt } = req.body
    if (!message && !image) {
      return res.status(400).json({ error: 'Message or image required' })
    }
    const result = await processChat(
      message || 'Image analysis',
      image,
      customPrompt
    )
    res.json({
      response: result.text,
      usage: result.usage,
      userMessageId: result.userMessageId,
      modelMessageId: result.modelMessageId,
      imagePath: result.imagePath
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/history', authenticateToken, (req, res) => {
  try {
    const { page, limit, offset } = req.query
    const history = getChatHistory(
      Number(page),
      Number(limit),
      offset !== undefined ? Number(offset) : null
    )
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/image/:filename', authenticateToken, (req, res) => {
  const { filename } = req.params

  // Specialized security: Only allow tokens specifically for image access in URL
  if (req.query.token && req.user.purpose !== 'image_access') {
    return res.status(403).json({ error: 'Regular tokens not allowed in URL' })
  }

  // Basic security check to prevent path traversal
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filePath = path.join(__dirname, '../../chat/image', filename)
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath)
  } else {
    res.status(404).json({ error: 'Image not found' })
  }
})

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    // Get message to check if it has an image
    const message = db
      .prepare('SELECT image_data FROM chat_history WHERE id = ?')
      .get(id)

    if (message && message.image_data) {
      const imagePath = path.join(
        __dirname,
        '../../chat/image',
        message.image_data
      )
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    db.prepare('DELETE FROM chat_history WHERE id = ?').run(id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
