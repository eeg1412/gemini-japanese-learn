import jwt from 'jsonwebtoken'
import { getSecret } from '../config/secret.js'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  // Bearer <token> OR query param ?token=
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, getSecret(), (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}
