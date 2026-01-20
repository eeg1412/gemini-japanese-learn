import express from 'express'
import db from '../db/index.js'

const router = express.Router()

// Token Stats
router.get('/stats/token', (req, res) => {
  const { startDate, endDate } = req.query

  // Validation
  const start = parseInt(startDate)
  const end = parseInt(endDate)

  if (isNaN(start) || isNaN(end)) {
    return res.status(400).json({ message: 'Invalid start or end date' })
  }

  try {
    const rows = db
      .prepare(
        'SELECT usage FROM chat_history WHERE created_at BETWEEN ? AND ?'
      )
      .all(start, end)

    let totalTokens = 0
    let promptTokens = 0
    let candidatesTokens = 0
    let thoughtsTokens = 0
    let cachedTokens = 0
    let toolPromptTokens = 0

    // Detailed modalities
    const promptDetails = {}
    const candidatesDetails = {}
    const cacheDetails = {}
    const toolUseDetails = {}

    rows.forEach(row => {
      if (row.usage) {
        try {
          const usage = JSON.parse(row.usage)
          if (usage.totalTokenCount) totalTokens += usage.totalTokenCount
          if (usage.promptTokenCount) promptTokens += usage.promptTokenCount
          if (usage.candidatesTokenCount)
            candidatesTokens += usage.candidatesTokenCount
          if (usage.thoughtsTokenCount)
            thoughtsTokens += usage.thoughtsTokenCount
          if (usage.cachedContentTokenCount)
            cachedTokens += usage.cachedContentTokenCount
          if (usage.toolUsePromptTokenCount)
            toolPromptTokens += usage.toolUsePromptTokenCount

          // Modality details
          if (usage.promptTokensDetails) {
            usage.promptTokensDetails.forEach(d => {
              promptDetails[d.modality] =
                (promptDetails[d.modality] || 0) + d.tokenCount
            })
          }
          if (usage.candidatesTokensDetails) {
            usage.candidatesTokensDetails.forEach(d => {
              candidatesDetails[d.modality] =
                (candidatesDetails[d.modality] || 0) + d.tokenCount
            })
          }
          if (usage.cacheTokensDetails) {
            usage.cacheTokensDetails.forEach(d => {
              cacheDetails[d.modality] =
                (cacheDetails[d.modality] || 0) + d.tokenCount
            })
          }
          if (usage.toolUsePromptTokensDetails) {
            usage.toolUsePromptTokensDetails.forEach(d => {
              toolUseDetails[d.modality] =
                (toolUseDetails[d.modality] || 0) + d.tokenCount
            })
          }
        } catch (e) {
          // Ignore parse errors for legacy data
        }
      }
    })

    res.json({
      totalTokens,
      promptTokens,
      candidatesTokens,
      thoughtsTokens,
      cachedTokens,
      toolPromptTokens,
      promptDetails: Object.entries(promptDetails).map(
        ([modality, tokenCount]) => ({ modality, tokenCount })
      ),
      candidatesDetails: Object.entries(candidatesDetails).map(
        ([modality, tokenCount]) => ({ modality, tokenCount })
      ),
      cacheDetails: Object.entries(cacheDetails).map(
        ([modality, tokenCount]) => ({ modality, tokenCount })
      ),
      toolUseDetails: Object.entries(toolUseDetails).map(
        ([modality, tokenCount]) => ({ modality, tokenCount })
      ),
      count: rows.length
    })
  } catch (err) {
    console.error('Error fetching token stats:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Login Logs
router.get('/stats/login', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const offset = (page - 1) * limit

  try {
    const totalResult = db
      .prepare('SELECT COUNT(*) as count FROM login_logs')
      .get()
    const total = totalResult ? totalResult.count : 0

    const logs = db
      .prepare(
        'SELECT * FROM login_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .all(limit, offset)

    res.json({
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (err) {
    console.error('Error fetching login logs:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
