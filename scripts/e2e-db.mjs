/**
 * Fresh local libSQL database for the end-to-end suite: removes the old file,
 * applies every migration in db/migrations, then runs the demo seed.
 *
 *   TURSO_DATABASE_URL=file:.e2e/test.db node scripts/e2e-db.mjs
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
if (!url?.startsWith('file:')) {
    console.error('scripts/e2e-db.mjs only runs against a local file: database')
    process.exit(1)
}

const file = url.slice('file:'.length)
mkdirSync(dirname(file), { recursive: true })
for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(file + suffix, { force: true })

const client = createClient({ url })
const migrations = join(process.cwd(), 'db', 'migrations')
for (const name of readdirSync(migrations)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const statements = readFileSync(join(migrations, name), 'utf8')
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
    for (const statement of statements) await client.execute(statement)
}
client.close()

execFileSync('npx', ['tsx', 'scripts/seed.ts'], { stdio: 'inherit', env: process.env })
console.log(`e2e database ready at ${file}`)
