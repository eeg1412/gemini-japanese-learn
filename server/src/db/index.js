import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../../database.sqlite')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vocabularies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original TEXT UNIQUE NOT NULL,
      reading TEXT,
      meaning TEXT,
      example TEXT,
      type TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT CHECK(role IN ('user', 'model')) NOT NULL,
      content TEXT,
      image_data TEXT,
      created_at INTEGER NOT NULL
    );
  `)
  console.log('Database initialized.')
}

export default db
