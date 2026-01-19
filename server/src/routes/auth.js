import express from 'express'
import jwt from 'jsonwebtoken'
import { getSecret } from '../config/secret.js'
import db from '../db/index.js'

const router = express.Router()

// Helper to get client IP
function getClientIp(req) {
  // Cloudflare or other CDN headers usually come first in x-forwarded-for
  const xForwardedFor = req.headers['x-forwarded-for']
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  return req.ip || req.connection.remoteAddress
}

router.post('/login', (req, res) => {
  const { username, password, rememberMe } = req.body
  const ip = getClientIp(req)
  const oneHourAgo = Date.now() - 3600000

  // 1. Check for rate limiting
  try {
    const failureCountResult = db
      .prepare(
        "SELECT COUNT(*) as count FROM login_logs WHERE username = ? AND status = 'failure' AND created_at > ?"
      )
      .get(username, oneHourAgo)

    if (failureCountResult && failureCountResult.count >= 5) {
      return res.status(429).json({
        message: '错误次数过多，稍后再试。'
      })
    }
  } catch (err) {
    console.error('Error checking login logs:', err)
    // In case of DB error, we might want to fail open or closed. Failing closed for security.
    return res.status(500).json({ message: 'Internal server error' })
  }

  // 2. Verify Credentials
  const isAdmin =
    username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS

  // 3. Log the attempt
  try {
    db.prepare(
      'INSERT INTO login_logs (username, ip, status, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      username || 'unknown',
      ip,
      isAdmin ? 'success' : 'failure',
      Date.now()
    )
  } catch (err) {
    console.error('Error logging login attempt:', err)
  }

  // 4. Respond
  if (isAdmin) {
    const user = { name: username }
    const expiresIn = rememberMe ? '365d' : '24h'
    const accessToken = jwt.sign(user, getSecret(), { expiresIn })
    res.json({ accessToken })
  } else {
    res.status(401).json({ message: 'Invalid credentials' })
  }
})

export default router
