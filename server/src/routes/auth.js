import express from 'express'
import jwt from 'jsonwebtoken'
import { getSecret } from '../config/secret.js'

const router = express.Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    // Expires in 24h
    const user = { name: username }
    const accessToken = jwt.sign(user, getSecret(), { expiresIn: '24h' })
    res.json({ accessToken })
  } else {
    res.status(401).json({ message: 'Invalid credentials' })
  }
})

export default router
