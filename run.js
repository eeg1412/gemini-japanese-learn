import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const runCommand = (command, args, cwd, name) => {
  return new Promise((resolve, reject) => {
    console.log(`[${name}] Starting: ${command} ${args.join(' ')}`)
    const process = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    })

    process.on('close', code => {
      if (code !== 0) {
        console.error(`[${name}] Exited with code ${code}`)
        reject(new Error(`${name} failed`))
      } else {
        console.log(`[${name}] Completed successfully`)
        resolve()
      }
    })
  })
}

async function main() {
  const serverDir = path.join(__dirname, 'server')
  const clientDir = path.join(__dirname, 'client')

  try {
    // 1. Install dependencies
    console.log('--- Installing Dependencies ---')
    await Promise.all([
      runCommand('yarn', ['install'], serverDir, 'Server-Install'),
      runCommand('yarn', ['install'], clientDir, 'Client-Install')
    ])

    // 2. Run both
    console.log('--- Starting Services ---')
    // Both are long-running, so we don't await them as a sequence.
    // We use spawn and let them run.

    const server = spawn('yarn', ['run', 'start'], {
      cwd: serverDir,
      shell: true,
      stdio: 'inherit'
    })
    const client = spawn('yarn', ['run', 'dev'], {
      cwd: clientDir,
      shell: true,
      stdio: 'inherit'
    })

    process.on('SIGINT', () => {
      server.kill()
      client.kill()
      process.exit()
    })
  } catch (err) {
    console.error('Initialization failed:', err)
    process.exit(1)
  }
}

main()
