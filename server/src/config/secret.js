import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const secretPath = path.join(__dirname, '../../secret.key')

let secret = ''

try {
  if (fs.existsSync(secretPath)) {
    secret = fs.readFileSync(secretPath, 'utf8').trim()
  } else {
    console.warn(
      'Warning: secret.key file not found. JWT operations will fail until you run the keygen script.'
    )
  }
} catch (err) {
  console.error('Error reading secret.key:', err)
}

export const getSecret = () => secret
