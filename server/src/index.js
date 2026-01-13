import './config/env.js'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db/index.js'
import authRoutes from './routes/auth.js'
import vocabRoutes from './routes/vocab.js'
import chatRoutes from './routes/chat.js'
// We will add other routes later

// Init Env
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' })) // Support large image payloads

// Init DB
initDb()

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/vocab', vocabRoutes)

// Define static path
const publicPath = path.join(__dirname, '../public')
app.use(express.static(publicPath))

// Vue history mode support - redirect all non-api requests to index.html
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API Route not found' })
  }
  res.sendFile(path.join(publicPath, 'index.html'))
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
