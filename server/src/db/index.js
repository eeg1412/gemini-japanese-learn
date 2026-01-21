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
      learned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT CHECK(role IN ('user', 'model')) NOT NULL,
      content TEXT,
      image_data TEXT,
      usage TEXT,
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
      learned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      ip TEXT NOT NULL,
      status TEXT CHECK(status IN ('success', 'failure')) NOT NULL,
      created_at INTEGER NOT NULL
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
  const hasLearnedVocab = vocabColumns.some(c => c.name === 'learned')
  if (!hasLearnedVocab) {
    db.exec(
      'ALTER TABLE vocabularies ADD COLUMN learned INTEGER NOT NULL DEFAULT 0'
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

  const chatColumns = db.prepare('PRAGMA table_info(chat_history)').all()
  const hasUsage = chatColumns.some(c => c.name === 'usage')
  if (!hasUsage) {
    db.exec('ALTER TABLE chat_history ADD COLUMN usage TEXT')
  }

  const loginColumns = db.prepare('PRAGMA table_info(login_logs)').all()
  const hasUsername = loginColumns.some(c => c.name === 'username')
  if (!hasUsername) {
    db.exec('ALTER TABLE login_logs ADD COLUMN username TEXT')
  }

  const grammarColumns = db.prepare('PRAGMA table_info(grammars)').all()
  const hasLearnedGrammar = grammarColumns.some(c => c.name === 'learned')
  if (!hasLearnedGrammar) {
    db.exec(
      'ALTER TABLE grammars ADD COLUMN learned INTEGER NOT NULL DEFAULT 0'
    )
  }

  console.log('Database initialized.')
}

export default db
