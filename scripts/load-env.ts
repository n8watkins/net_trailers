/**
 * Load environment variables from .env.local for Node.js scripts.
 *
 * Variables already set in the environment win, so a script can also run with
 * `vercel env run -- npx tsx scripts/<name>.ts` and no .env.local at all.
 * Values are never printed.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')

if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [key, ...valueParts] = trimmed.split('=')
        if (!key || valueParts.length === 0) continue
        const name = key.trim()
        if (process.env[name] === undefined) {
            process.env[name] = valueParts.join('=').trim()
        }
    }
    console.log('Environment variables loaded from .env.local')
}
