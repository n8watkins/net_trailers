// The pre-deploy check: serves the built Worker (.open-next/worker.js, from
// `npm run build:worker`) on this machine with `wrangler dev`, then makes the
// requests the edge cache never answers, with and without a cookie. A
// dependency update that broke the server's own request handling (the cookie
// header crash of 2026-11-25, Cloudflare error 1101) failed here instead of
// on the live site, where every cached page still looked fine.
//
//   node scripts/check-worker.ts [--port 8787] [--timeout 180]
//
// Needs no secrets and sends nothing off this machine. Stops the server it
// started, also when the check fails or is interrupted.

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { COOKIE_PROBES, PROBE_COOKIE, probeProblem } from './deploy-check.ts'

function option(name: string, fallback: string): string {
    const at = process.argv.indexOf(`--${name}`)
    const value = at === -1 ? fallback : process.argv[at + 1]
    if (value === undefined || value.startsWith('--')) {
        console.error(`Missing value for --${name}. Usage: node scripts/check-worker.ts [--port N]`)
        process.exit(2)
    }
    return value
}

const port = Number(option('port', '8787'))
const timeoutSeconds = Number(option('timeout', '180'))
if (!Number.isInteger(port) || port < 1 || !Number.isFinite(timeoutSeconds)) {
    console.error('--port and --timeout must be numbers')
    process.exit(2)
}
const base = `http://localhost:${port}`
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

async function status(path: string, cookie?: string): Promise<number> {
    const response = await fetch(`${base}${path}`, {
        headers: cookie ? { cookie } : {},
        redirect: 'manual',
    })
    await response.body?.cancel()
    return response.status
}

// Own process group, so stopping it also stops the workerd child.
const server = spawn(
    'npx',
    ['wrangler', 'dev', '--port', String(port), '--inspector-port', String(port + 1)],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } }
)
let serverLog = ''
for (const stream of [server.stdout, server.stderr]) {
    stream.on('data', (chunk) => {
        serverLog = (serverLog + chunk).slice(-8000)
    })
}
const exited = once(server, 'exit').then(() => true)

function stopServer(): void {
    if (server.pid === undefined || server.exitCode !== null) return
    try {
        process.kill(-server.pid, 'SIGTERM')
    } catch {
        // already gone
    }
    setTimeout(() => {
        try {
            process.kill(-server.pid!, 'SIGKILL')
        } catch {
            // already gone
        }
    }, 3000).unref()
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        stopServer()
        process.exit(130)
    })
}

/**
 * /api/health/ai answers 200 only with a working Gemini key, which this check
 * has not got: the app's own 503 ("not_configured") is as good an answer here.
 * What must never happen is the 500 of a handler that threw.
 */
function isServed(answered: number): boolean {
    return answered === 200 || answered === 503
}

/** Waits until a request without a cookie gets an answer from the Worker. */
async function waitUntilServing(): Promise<string | null> {
    const deadline = Date.now() + timeoutSeconds * 1000
    while (Date.now() < deadline) {
        if (await Promise.race([exited, wait(0).then(() => false)])) {
            return 'wrangler dev stopped before it served a request'
        }
        try {
            if (isServed(await status('/api/health/ai'))) return null
        } catch {
            // not listening yet
        }
        await wait(2000)
    }
    return `the Worker did not answer 200 on /api/health/ai within ${timeoutSeconds}s`
}

async function main(): Promise<number> {
    console.log(`Serving the built Worker on ${base} ...`)
    const notServing = await waitUntilServing()
    if (notServing) {
        console.error(`FAILED: ${notServing}`)
        console.error(serverLog)
        return 1
    }
    const problems: string[] = []
    for (const probe of COOKIE_PROBES) {
        let answered: number
        try {
            answered = await status(probe.path, PROBE_COOKIE)
        } catch (error) {
            problems.push(`${probe.path} sent with a cookie could not be fetched: ${String(error)}`)
            continue
        }
        console.log(
            `${probe.path} with a cookie: ${answered} (expected ${probe.status}, or 503 without a Gemini key)`
        )
        problems.push(
            ...probeProblem(probe, probe.status === 200 && isServed(answered) ? 200 : answered)
        )
    }
    if (problems.length === 0) {
        console.log('OK: the built Worker answers requests that carry a cookie.')
        return 0
    }
    console.error('FAILED: the built Worker mishandles requests that carry a cookie:')
    for (const problem of problems) console.error(`- ${problem}`)
    console.error('Last server output:')
    console.error(serverLog)
    return 1
}

let code = 1
try {
    code = await main()
} finally {
    stopServer()
}
process.exit(code)
