// One-command dev environment: checks setup, then starts the Next.js dev server.
import { existsSync } from 'node:fs'
import { spawnSync, spawn } from 'node:child_process'
import 'dotenv/config'

const run = (cmd) => spawnSync(cmd, { stdio: 'inherit', shell: true }).status === 0

if (!existsSync('node_modules') && !run('npm install')) process.exit(1)

const required = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(', ')} (see .env.example)`)
  process.exit(1)
}

// Keep the Prisma client in sync with the schema (needed after pulling schema changes).
if (!run('npx prisma generate')) process.exit(1)

console.log('\nStarting dev server at', process.env.NEXTAUTH_URL, '\n')
const server = spawn('npx next dev', { stdio: 'inherit', shell: true })
server.on('exit', (code) => process.exit(code ?? 0))
