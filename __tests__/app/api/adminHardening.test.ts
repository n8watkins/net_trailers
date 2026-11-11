/**
 * @jest-environment node
 *
 * The admin hardening: unsubscribed users never get admin email, dangerous
 * actions need a fresh sign-in and are audited, non-admins get 403, the cron
 * routes ignore admin sessions, bodies are validated, and the admin data
 * (sign-up and sign-in dates, login events, activity filters) is right.
 */

import { readFileSync, readdirSync } from 'fs'
import path from 'path'

import { eq, sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

import { auth } from '@/auth'
import { db } from '@/db'
import {
    adminAudit,
    adminEmails,
    cronRuns,
    signupLog,
    userActivity,
    userPreferences,
    users,
} from '@/db/schema'
import { recordSignIn, recordSignUp } from '@/lib/authEvents'
import { EmailService } from '@/lib/email/email-service'

import { GET as activityGET } from '@/app/api/admin/activity/route'
import { GET as auditGET } from '@/app/api/admin/audit/route'
import { GET as historyGET } from '@/app/api/admin/email/history/route'
import { POST as previewPOST } from '@/app/api/admin/email/preview/route'
import { POST as recipientsPOST } from '@/app/api/admin/email/recipients/route'
import { POST as sendPOST } from '@/app/api/admin/email/send/route'
import { GET as usageGET } from '@/app/api/admin/email/usage/route'
import { POST as initStatsPOST } from '@/app/api/admin/init-stats/route'
import { POST as jobPOST } from '@/app/api/admin/jobs/[name]/route'
import { GET as jobsGET } from '@/app/api/admin/jobs/route'
import { GET as filteredGET } from '@/app/api/admin/users/filtered/route'
import { GET as usersGET } from '@/app/api/admin/users/route'
import { GET as cacheCronGET } from '@/app/api/cron/refresh-collection-cache/route'
import { GET as socialCronGET } from '@/app/api/cron/social-digest/route'
import { GET as trendingCronGET } from '@/app/api/cron/update-trending/route'

jest.mock('@/lib/email/cloudflare', () => ({
    EMAIL_FROM: 'net-trailers@n8builds.dev',
    emailBinding: () => null,
}))
// sanitize-html is ESM-only under Jest; the validation rules are tested elsewhere.
jest.mock('@/lib/email/email-validation', () => ({
    validateEmailTemplate: () => ({ valid: true }),
    sanitizeEmailHtml: (html: string) => html,
}))
jest.mock('@/lib/email/email-service', () => ({
    EmailService: { sendAnnouncement: jest.fn(), sendCustomEmail: jest.fn() },
}))
jest.mock('@/lib/jobs/trendingDigest', () => ({
    runTrendingDigest: jest.fn(async () => ({ emailsSent: 2, notificationsCreated: 6 })),
}))
jest.mock('@/lib/jobs/socialDigest', () => ({
    runSocialDigest: jest.fn(async () => ({ emailsSent: 0 })),
}))
jest.mock('@/lib/jobs/collectionCache', () => ({
    runCollectionCacheRefresh: jest.fn(async () => ({ collectionsUpdated: 0 })),
}))

const mockAuth = auth as unknown as jest.Mock
const sendAnnouncement = EmailService.sendAnnouncement as jest.Mock

const ADMIN = { id: 'admin-1', email: 'admin@example.com' }

function signInAs(
    user: { id: string; email: string } | null,
    opts: { isAdmin?: boolean; signedInAt?: number | null } = {}
) {
    mockAuth.mockResolvedValue(
        user
            ? {
                  user: {
                      ...user,
                      isAdmin: opts.isAdmin ?? true,
                      signedInAt: opts.signedInAt === undefined ? Date.now() : opts.signedInAt,
                  },
                  expires: new Date(Date.now() + 86400000).toISOString(),
              }
            : null
    )
}

const post = (url: string, body: unknown) =>
    new NextRequest(`https://nt.example${url}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    })
const get = (url: string, headers: Record<string, string> = {}) =>
    new NextRequest(`https://nt.example${url}`, { headers })

const announcement = { template: 'announcement', subject: 'Hello', customMessage: 'News' }

async function prefs(userId: string, email: boolean | undefined) {
    await db.insert(userPreferences).values({
        userId,
        data: (email === undefined ? {} : { notifications: { email } }) as never,
        updatedAt: Date.now(),
    })
}

beforeAll(async () => {
    const migDir = path.join(process.cwd(), 'db/migrations')
    for (const file of readdirSync(migDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()) {
        const statements = readFileSync(path.join(migDir, file), 'utf-8')
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter(Boolean)
        for (const stmt of statements) await db.run(sql.raw(stmt))
    }
    await db
        .insert(users)
        .values([
            ADMIN,
            { id: 'on', email: 'on@example.com' },
            { id: 'unsub', email: 'unsub@example.com' },
            { id: 'default', email: 'default@example.com' },
            { id: 'noprefs', email: 'noprefs@example.com' },
        ])
    await prefs('on', true)
    await prefs('unsub', false)
    await prefs('default', undefined)
})

beforeEach(() => {
    sendAnnouncement.mockReset()
    signInAs(ADMIN)
})

describe('admin email never reaches unsubscribed users', () => {
    it('sends only to users with email on, and counts the skipped', async () => {
        const res = await sendPOST(
            post('/api/admin/email/send', {
                mode: 'send',
                userIds: ['on', 'unsub', 'default', 'noprefs'],
                ...announcement,
            })
        )
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toMatchObject({ emailsSent: 1, skippedOptedOut: 3 })
        expect(sendAnnouncement).toHaveBeenCalledTimes(1)
        expect(sendAnnouncement.mock.calls[0][0].to).toBe('on@example.com')
    })

    it('the recipient preview leaves them out too', async () => {
        const res = await recipientsPOST(
            post('/api/admin/email/recipients', { userIds: ['on', 'unsub', 'default'] })
        )
        expect(await res.json()).toEqual({
            count: 1,
            sample: ['on@example.com'],
            skippedOptedOut: 2,
            notFound: 0,
        })
    })

    it('the recipient list marks them as unable to receive email', async () => {
        const res = await filteredGET(get('/api/admin/users/filtered?filter=all'))
        const { users: list } = await res.json()
        const byId = Object.fromEntries(list.map((u: { userId: string }) => [u.userId, u]))
        expect(byId.on.canReceiveEmail).toBe(true)
        expect(byId.unsub.canReceiveEmail).toBe(false)
        expect(byId.default.canReceiveEmail).toBe(false)
    })

    it('the preview refuses a user with email off', async () => {
        const res = await previewPOST(
            post('/api/admin/email/preview', { userId: 'unsub', ...announcement })
        )
        expect(res.status).toBe(409)
    })

    it('a test send goes to the admin only', async () => {
        const res = await sendPOST(post('/api/admin/email/send', { mode: 'test', ...announcement }))
        expect(await res.json()).toMatchObject({ success: true, emailsSent: 1 })
        expect(sendAnnouncement).toHaveBeenCalledTimes(1)
        expect(sendAnnouncement.mock.calls[0][0].to).toBe(ADMIN.email)
    })
})

describe('fresh sign-in for dangerous actions', () => {
    it('a sign-in older than 15 minutes cannot send email', async () => {
        signInAs(ADMIN, { signedInAt: Date.now() - 16 * 60 * 1000 })
        const res = await sendPOST(
            post('/api/admin/email/send', { mode: 'send', userIds: ['on'], ...announcement })
        )
        expect(res.status).toBe(403)
        expect((await res.json()).code).toBe('reauth_required')
        expect(sendAnnouncement).not.toHaveBeenCalled()
    })

    it('a session without a recorded sign-in time cannot run a job', async () => {
        signInAs(ADMIN, { signedInAt: null })
        const res = await jobPOST(post('/api/admin/jobs/trending', { scope: 'all' }), {
            params: Promise.resolve({ name: 'trending' }),
        })
        expect(res.status).toBe(403)
        expect((await res.json()).code).toBe('reauth_required')
    })
})

describe('the audit log', () => {
    it('records sends and job runs with counts, never addresses or bodies', async () => {
        await db.delete(adminAudit)
        await sendPOST(
            post('/api/admin/email/send', {
                mode: 'send',
                userIds: ['on', 'unsub'],
                ...announcement,
            })
        )
        const jobRes = await jobPOST(post('/api/admin/jobs/trending', { scope: 'admin' }), {
            params: Promise.resolve({ name: 'trending' }),
        })
        expect(jobRes.status).toBe(200)

        const rows = await db.select().from(adminAudit)
        const send = rows.find((r) => r.action === 'email.send')!
        expect(send.actorId).toBe(ADMIN.id)
        expect(send.actorEmail).toBe(ADMIN.email)
        expect(send.details).toMatchObject({ requested: 2, sent: 1, skippedOptedOut: 1 })
        const serialized = JSON.stringify(rows)
        expect(serialized).not.toContain('on@example.com')
        expect(serialized).not.toContain('News')
        expect(serialized).not.toContain('Hello')

        const job = rows.find((r) => r.action === 'job.run')!
        expect(job.details).toMatchObject({ job: 'trending', scope: 'admin', ok: true })

        const res = await auditGET()
        expect((await res.json()).entries.length).toBe(2)
    })

    it('records each job run in cron_runs for the last-run display', async () => {
        const res = await jobsGET()
        const { jobs } = await res.json()
        const trending = jobs.find((j: { name: string }) => j.name === 'trending')
        expect(trending.schedule).toBe('Mondays at 02:00 UTC')
        expect(trending.lastRun).toMatchObject({ trigger: 'admin', scope: 'admin', ok: true })
        expect(new Date(trending.nextRun).getUTCDay()).toBe(1)
    })
})

describe('non-admins and signed-out visitors', () => {
    const calls: [string, () => Promise<Response>][] = [
        ['activity', () => activityGET(get('/api/admin/activity'))],
        ['audit', () => auditGET()],
        ['history', () => historyGET(get('/api/admin/email/history'))],
        [
            'preview',
            () => previewPOST(post('/api/admin/email/preview', { userId: 'on', ...announcement })),
        ],
        [
            'recipients',
            () => recipientsPOST(post('/api/admin/email/recipients', { userIds: ['on'] })),
        ],
        ['send', () => sendPOST(post('/api/admin/email/send', { mode: 'test', ...announcement }))],
        ['usage', () => usageGET()],
        ['init-stats', () => initStatsPOST()],
        ['jobs', () => jobsGET()],
        [
            'jobs/run',
            () =>
                jobPOST(post('/api/admin/jobs/trending', { scope: 'admin' }), {
                    params: Promise.resolve({ name: 'trending' }),
                }),
        ],
        ['users', () => usersGET()],
        ['users/filtered', () => filteredGET(get('/api/admin/users/filtered'))],
    ]

    it.each(calls)('%s answers 403 to a non-admin', async (_name, call) => {
        signInAs({ id: 'on', email: 'on@example.com' }, { isAdmin: false })
        expect((await call()).status).toBe(403)
    })

    it.each(calls)('%s answers 401 when signed out', async (_name, call) => {
        signInAs(null)
        expect((await call()).status).toBe(401)
    })
})

describe('the cron routes', () => {
    const crons = [
        ['update-trending', trendingCronGET],
        ['refresh-collection-cache', cacheCronGET],
        ['social-digest', socialCronGET],
    ] as const

    it.each(crons)('%s ignores an admin session without CRON_SECRET', async (route, GET) => {
        process.env.CRON_SECRET = 'cron-secret'
        const before = (await db.select().from(cronRuns)).length
        const res = await GET(get(`/api/cron/${route}?adminOnly=false`))
        expect(res.status).toBe(401)
        expect((await db.select().from(cronRuns)).length).toBe(before)
    })

    it('runs with CRON_SECRET and records the run', async () => {
        process.env.CRON_SECRET = 'cron-secret'
        const res = await trendingCronGET(
            get('/api/cron/update-trending', { authorization: 'Bearer cron-secret' })
        )
        expect(res.status).toBe(200)
        const [last] = await db.select().from(cronRuns).where(eq(cronRuns.trigger, 'cron'))
        expect(last).toMatchObject({ job: 'trending', scope: 'all', ok: true })
    })
})

describe('request validation', () => {
    it('a bad userIds is a 400 without internals', async () => {
        const res = await sendPOST(
            post('/api/admin/email/send', { mode: 'send', userIds: 'abc', ...announcement })
        )
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Invalid request body' })
    })

    it.each([
        ['not JSON', '{'],
        ['unknown template', { mode: 'send', userIds: ['on'], template: 'trending', subject: 'x' }],
        ['too many recipients', { mode: 'send', ...announcement, userIds: Array(101).fill('on') }],
        ['an extra field', { mode: 'test', ...announcement, to: 'someone@example.com' }],
        ['no subject', { mode: 'test', template: 'announcement', customMessage: 'x' }],
    ])('send rejects %s with 400', async (_label, body) => {
        expect((await sendPOST(post('/api/admin/email/send', body))).status).toBe(400)
    })

    it('job runs need a known job and scope', async () => {
        const unknown = await jobPOST(post('/api/admin/jobs/nope', { scope: 'all' }), {
            params: Promise.resolve({ name: 'nope' }),
        })
        expect(unknown.status).toBe(404)
        const badScope = await jobPOST(post('/api/admin/jobs/cache', { scope: 'everyone' }), {
            params: Promise.resolve({ name: 'cache' }),
        })
        expect(badScope.status).toBe(400)
    })

    it('the activity and recipient queries reject unknown values', async () => {
        expect((await activityGET(get('/api/admin/activity?type=logins'))).status).toBe(400)
        expect((await filteredGET(get('/api/admin/users/filtered?filter=bogus'))).status).toBe(400)
    })
})

describe('admin data', () => {
    it('a sign-up gets a creation date, a signup_log row and, on sign-in, lastLoginAt and a login event', async () => {
        const before = Date.now()
        await db.insert(users).values({ id: 'fresh', email: 'fresh@example.com' })
        await recordSignUp('fresh')
        await recordSignIn('fresh', 'email')

        const [row] = await db.select().from(users).where(eq(users.id, 'fresh'))
        expect(row.createdAt).toBeGreaterThanOrEqual(before)
        expect(row.lastLoginAt).toBeGreaterThanOrEqual(before)
        expect(await db.select().from(signupLog).where(eq(signupLog.userId, 'fresh'))).toHaveLength(
            1
        )
        const logins = await db.select().from(userActivity).where(eq(userActivity.userId, 'fresh'))
        expect(logins).toMatchObject([{ type: 'login', referenceType: 'email' }])

        const res = await usersGET()
        const list = (await res.json()).users as {
            uid: string
            createdAt: string | null
            lastSignInAt: string | null
        }[]
        const fresh = list.find((u) => u.uid === 'fresh')!
        expect(Date.parse(fresh.createdAt!)).toBeGreaterThanOrEqual(before)
        expect(Date.parse(fresh.lastSignInAt!)).toBeGreaterThanOrEqual(before)

        const stats = await (await initStatsPOST()).json()
        expect(stats.signupsToday).toBeGreaterThanOrEqual(1)
        expect(stats.lastSignup).toBeGreaterThanOrEqual(before)
    })

    it('an account without dates shows null, never 1969', async () => {
        await db.run(sql`UPDATE user SET createdAt = NULL, lastLoginAt = NULL WHERE id = 'noprefs'`)
        const list = (await (await usersGET()).json()).users as {
            uid: string
            createdAt: string | null
        }[]
        expect(list.find((u) => u.uid === 'noprefs')!.createdAt).toBeNull()
    })

    it('the activity filters match the stored login and view types', async () => {
        await db.insert(userActivity).values({
            userId: 'fresh',
            type: 'view',
            timestamp: Date.now(),
            referenceId: '/movies',
            referenceType: 'page',
        })
        const logins = await (await activityGET(get('/api/admin/activity?type=login'))).json()
        const views = await (await activityGET(get('/api/admin/activity?type=view'))).json()
        expect(logins.activities.length).toBeGreaterThan(0)
        expect(logins.activities.every((a: { type: string }) => a.type === 'login')).toBe(true)
        expect(views.activities.length).toBeGreaterThan(0)
        expect(views.activities.every((a: { type: string }) => a.type === 'view')).toBe(true)
    })

    it('records a send in the email history', async () => {
        const rows = await db.select().from(adminEmails)
        expect(rows.length).toBeGreaterThan(0)
    })
})
