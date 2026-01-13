import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')
const serverEnvPath = path.join(serverDir, '.env')
const serverSecretKeyPath = path.join(serverDir, 'secret.key')

function parseDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) return {}
  const text = fs.readFileSync(dotEnvPath, 'utf8')
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function getEnvValue(key) {
  if (process.env[key]) return process.env[key]
  const envFromFile = parseDotEnv(serverEnvPath)
  return envFromFile[key]
}

function assertSecretConfigured() {
  const apiKey = getEnvValue('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error(
      '缺少 GEMINI_API_KEY。请在 server/.env 或环境变量中配置 GEMINI_API_KEY 后再运行。'
    )
  }
}

function hasJwtSecretKey() {
  try {
    if (!fs.existsSync(serverSecretKeyPath)) return false
    const content = fs.readFileSync(serverSecretKeyPath, 'utf8').trim()
    return Boolean(content)
  } catch {
    return false
  }
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options)
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`)
        )
    })
  })
}

try {
  assertSecretConfigured()

  const yarnCmd = 'yarn'

  if (!hasJwtSecretKey()) {
    console.log('[start] 未检测到 server/secret.key，先执行 keygen...')
    await runCommand(yarnCmd, ['run', 'keygen'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    })
  }

  const child = spawn(yarnCmd, ['--cwd', 'server', 'start'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  })

  child.on('exit', code => process.exit(code ?? 0))
  child.on('error', err => {
    console.error(err)
    process.exit(1)
  })
} catch (err) {
  console.error(String(err?.message || err))
  process.exit(1)
}
