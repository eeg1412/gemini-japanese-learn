import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 生成 64 字节的随机十六进制字符串
const secret = crypto.randomBytes(64).toString('hex')

console.log('Generated JWT Secret:')
console.log(secret)

const secretFile = path.join(__dirname, '../server/secret.key')

try {
  fs.writeFileSync(secretFile, secret, 'utf8')
  console.log(`Secret key has been saved to: ${secretFile}`)
  console.log('This file is excluded from env and should be kept secure.')
} catch (err) {
  console.error('Failed to save secret key:', err)
}
