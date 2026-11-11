/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

import { sql } from 'drizzle-orm'
import ts from 'typescript'

import { db } from '@/db'
import { userActivity, users } from '@/db/schema'
import { FRESH_SIGN_IN_MS, isFreshSignIn } from '@/lib/admin/guard'
import { canReceiveAdminEmail } from '@/lib/admin/recipients'
import { allowedOrigins } from '@/lib/csrfProtection'
import { csvCell, toCsv } from '@/lib/csv'
import { JOBS, nextWeeklyRun } from '@/lib/jobs'
import { deleteOldPageViews } from '@/lib/jobs/retention'
import { CRON_ROUTES } from '../../worker/crons'

jest.mock('@/lib/jobs/trendingDigest', () => ({ runTrendingDigest: jest.fn() }))
jest.mock('@/lib/jobs/socialDigest', () => ({ runSocialDigest: jest.fn() }))
jest.mock('@/lib/jobs/collectionCache', () => ({ runCollectionCacheRefresh: jest.fn() }))

describe('isFreshSignIn', () => {
    const now = Date.UTC(2026, 10, 10, 12)
    it('accepts a sign-in up to 15 minutes old', () => {
        expect(isFreshSignIn(now - FRESH_SIGN_IN_MS, now)).toBe(true)
        expect(isFreshSignIn(now - 60_000, now)).toBe(true)
    })
    it('refuses an older or unknown sign-in', () => {
        expect(isFreshSignIn(now - FRESH_SIGN_IN_MS - 1, now)).toBe(false)
        expect(isFreshSignIn(null, now)).toBe(false)
        expect(isFreshSignIn(undefined, now)).toBe(false)
        expect(isFreshSignIn(now + 10 * 60_000, now)).toBe(false)
    })
})

describe('canReceiveAdminEmail', () => {
    it('is true only when email is explicitly on', () => {
        expect(canReceiveAdminEmail({ notifications: { email: true } })).toBe(true)
        expect(canReceiveAdminEmail({ notifications: { email: false } })).toBe(false)
        expect(canReceiveAdminEmail({ notifications: {} })).toBe(false)
        expect(canReceiveAdminEmail(null)).toBe(false)
        expect(canReceiveAdminEmail({ notifications: { email: 'true' } })).toBe(false)
    })
})

describe('CSV', () => {
    it('quotes every cell and doubles quotes', () => {
        expect(toCsv([['a,b', 'say "hi"', null, 3]])).toBe('"a,b","say ""hi""","","3"')
    })
    it('defuses spreadsheet formulas', () => {
        expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
        expect(csvCell('+1')).toBe(`"'+1"`)
        expect(csvCell('-2')).toBe(`"'-2"`)
        expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
        expect(csvCell('plain')).toBe('"plain"')
    })
    it('separates rows with CRLF', () => {
        expect(toCsv([['a'], ['b']])).toBe('"a"\r\n"b"')
    })
})

describe('allowedOrigins', () => {
    it('allows localhost only in development', () => {
        const prod = allowedOrigins({
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://nt.example',
        } as never)
        expect(prod).toEqual(['https://nt.example'])
        const dev = allowedOrigins({ NODE_ENV: 'development' } as never)
        expect(dev).toContain('http://localhost:3000')
    })
})

describe('job schedules', () => {
    it('match the Cron Triggers in wrangler.jsonc and worker/crons.ts', () => {
        const wrangler = ts.parseConfigFileTextToJson(
            'wrangler.jsonc',
            readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')
        ).config as { triggers: { crons: string[] } }
        const routes = {
            trending: 'update-trending',
            cache: 'refresh-collection-cache',
            social: 'social-digest',
        }
        for (const [name, job] of Object.entries(JOBS)) {
            expect(wrangler.triggers.crons).toContain(job.cron)
            expect(CRON_ROUTES[job.cron]).toBe(`/api/cron/${routes[name as keyof typeof routes]}`)
        }
    })

    it('computes the next weekly run in UTC', () => {
        // Tuesday 2026-11-10 12:00 UTC
        const now = Date.UTC(2026, 10, 10, 12)
        expect(new Date(nextWeeklyRun('0 2 * * WED', now)).toISOString()).toBe(
            '2026-11-11T02:00:00.000Z'
        )
        expect(new Date(nextWeeklyRun('0 2 * * MON', now)).toISOString()).toBe(
            '2026-11-16T02:00:00.000Z'
        )
        // The same day after 02:00 rolls to next week; before 02:00 it is today.
        expect(new Date(nextWeeklyRun('0 2 * * TUE', now)).toISOString()).toBe(
            '2026-11-17T02:00:00.000Z'
        )
        expect(
            new Date(nextWeeklyRun('0 2 * * TUE', Date.UTC(2026, 10, 10, 1))).toISOString()
        ).toBe('2026-11-10T02:00:00.000Z')
    })
})

describe('page-view retention', () => {
    beforeAll(async () => {
        const migDir = join(process.cwd(), 'db/migrations')
        const { readdirSync } = await import('fs')
        for (const file of readdirSync(migDir)
            .filter((f) => f.endsWith('.sql'))
            .sort()) {
            for (const stmt of readFileSync(join(migDir, file), 'utf-8')
                .split('--> statement-breakpoint')
                .map((s) => s.trim())
                .filter(Boolean))
                await db.run(sql.raw(stmt))
        }
        await db.insert(users).values({ id: 'u', email: 'u@example.com' })
    })

    it('deletes page views older than 90 days and keeps logins and recent views', async () => {
        const now = Date.now()
        const day = 86_400_000
        await db.insert(userActivity).values([
            { userId: 'u', type: 'view', timestamp: now - 91 * day, referenceType: 'page' },
            { userId: 'u', type: 'view', timestamp: now - 10 * day, referenceType: 'page' },
            { userId: 'u', type: 'login', timestamp: now - 200 * day, referenceType: 'email' },
        ])
        expect(await deleteOldPageViews(now)).toBe(1)
        const left = await db.select({ type: userActivity.type }).from(userActivity)
        expect(left.map((r) => r.type).sort()).toEqual(['login', 'view'])
    })
})
