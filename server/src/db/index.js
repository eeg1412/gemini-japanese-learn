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
      verb_category TEXT,
      conjugations TEXT,
      starred INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS grammars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grammar TEXT UNIQUE NOT NULL,
      explanation TEXT,
      structure TEXT,
      level TEXT,
      example TEXT,
      starred INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)

  // Lightweight migration for existing DBs
  const vocabColumns = db.prepare('PRAGMA table_info(vocabularies)').all()
  const hasStarred = vocabColumns.some(c => c.name === 'starred')
  if (!hasStarred) {
    db.exec(
      'ALTER TABLE vocabularies ADD COLUMN starred INTEGER NOT NULL DEFAULT 0'
    )
  }
  const hasVerbCategory = vocabColumns.some(c => c.name === 'verb_category')
  if (!hasVerbCategory) {
    db.exec('ALTER TABLE vocabularies ADD COLUMN verb_category TEXT')
  }
  const hasConjugations = vocabColumns.some(c => c.name === 'conjugations')
  if (!hasConjugations) {
    db.exec('ALTER TABLE vocabularies ADD COLUMN conjugations TEXT')
  }
  console.log('Database initialized.')
}

export default db
