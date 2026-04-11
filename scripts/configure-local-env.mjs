import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function parseEnvOutput(raw) {
  const entries = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes('=')) {
      continue
    }

    const [key, ...rest] = trimmed.split('=')
    entries[key] = rest.join('=')
  }
  return entries
}

function readSupabaseStatusEnv() {
  const output = execSync('pnpm dlx supabase@latest status --workdir infra -o env', {
    cwd: projectRoot,
    encoding: 'utf8'
  })

  return parseEnvOutput(output)
}

const status = readSupabaseStatusEnv()

const apiUrl = status.API_URL
const serviceRoleKey = status.SERVICE_ROLE_KEY
const anonKey = status.ANON_KEY

if (!apiUrl || !serviceRoleKey) {
  throw new Error('Missing API_URL or SERVICE_ROLE_KEY from local Supabase status')
}

const workerDevVarsPath = resolve(projectRoot, 'apps/bot-worker/.dev.vars')
const adminEnvLocalPath = resolve(projectRoot, 'apps/admin-web/.env.local')

const workerDevVars = [
  `SUPABASE_URL=${apiUrl}`,
  `SUPABASE_SECRET_KEY=${serviceRoleKey}`,
  `TELEGRAM_BOT_TOKEN=dev-token`,
  `OPENDART_API_KEY=${process.env.OPENDART_API_KEY ?? 'dev-opendart-key'}`,
  'APP_ENV=development',
  'OPENDART_REFRESH_CHECK=0',
  'ALLOW_DEV_FIXTURES=1',
  'LOCAL_SYNC_MODE=1'
].join('\n')

const adminEnvLocal = [
  'VITE_API_BASE_URL=http://127.0.0.1:8787',
  `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey ?? ''}`
].join('\n')

writeFileSync(workerDevVarsPath, `${workerDevVars}\n`, 'utf8')
writeFileSync(adminEnvLocalPath, `${adminEnvLocal}\n`, 'utf8')

console.log('Local env files generated:')
console.log(`- ${workerDevVarsPath}`)
console.log(`- ${adminEnvLocalPath}`)
