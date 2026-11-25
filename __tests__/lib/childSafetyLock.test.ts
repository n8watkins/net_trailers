/**
 * @jest-environment node
 *
 * Child Safety Mode for a signed-in account is decided on the server: the
 * stored setting, not the client-editable cookie, picks what the home page
 * shows, and while the account has a PIN no save turns the mode off unless the
 * PIN was entered right before. Guests keep the cookie as before.
 */

import { readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { setPIN } from '@/db/queries/childSafety'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { getChildSafetyMode } from '@/lib/childSafetyCookieServer'

import { POST as pinPOST } from '@/app/api/child-safety/pin/route'
import { DELETE as prefsDELETE, PUT as prefsPUT } from '@/app/api/user/preferences/route'

// A file rather than `:memory:`, so every libSQL connection (the rate_limits
// table is created lazily) sees the same database. The client is created on
// first query, after this line runs.
const dbFile = path.join(tmpdir(), `nettrailers-child-safety-${process.pid}-${Date.now()}.db`)
process.env.TURSO_DATABASE_URL = `file:${dbFile}`
afterAll(() => rmSync(dbFile, { force: true }))

let cookieValue: string | undefined
jest.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) =>
            name === 'nettrailer_child_safety' && cookieValue !== undefined
                ? { name, value: cookieValue }
                : undefined,
        set: jest.fn(),
    }),
}))

const mockAuth = auth as unknown as jest.Mock

function signInAs(userId: string | null) {
    mockAuth.mockResolvedValue(
        userId
            ? {
                  user: { id: userId, email: `${userId}@test.dev` },
                  expires: new Date(Date.now() + 86_400_000).toISOString(),
              }
            : null
    )
}

const json = (method: string, url: string, body?: unknown) =>
    new NextRequest(`https://nt.example${url}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })

async function putMode(userId: string, on: boolean) {
    const prefs = await loadUserPreferences(userId)
    return prefsPUT(
        json('PUT', '/api/user/preferences', { preferences: { ...prefs, childSafetyMode: on } })
    )
}

const storedMode = async (userId: string) => (await loadUserPreferences(userId)).childSafetyMode

beforeAll(async () => {
    const migDir = path.join(process.cwd(), 'db/migrations')
    for (const file of readdirSync(migDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()) {
        for (const stmt of readFileSync(path.join(migDir, file), 'utf-8')
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter(Boolean)) {
            await db.run(sql.raw(stmt))
        }
    }
    for (const id of ['parent', 'nopin']) {
        await db.insert(users).values({ id, email: `${id}@test.dev` })
    }
    await setPIN('parent', '4321')
})

beforeEach(async () => {
    cookieValue = undefined
    for (const id of ['parent', 'nopin']) {
        await saveUserPreferences(id, { ...(await loadUserPreferences(id)), childSafetyMode: true })
    }
})

describe('what decides Child Safety Mode on the server', () => {
    it('uses the stored setting for a signed-in account, whatever the cookie says', async () => {
        signInAs('parent')
        cookieValue = 'false'
        expect(await getChildSafetyMode()).toBe(true)
        cookieValue = undefined
        expect(await getChildSafetyMode()).toBe(true)
    })

    it('keeps using the cookie for a guest', async () => {
        signInAs(null)
        expect(await getChildSafetyMode()).toBe(false)
        cookieValue = 'true'
        expect(await getChildSafetyMode()).toBe(true)
    })
})

describe('the PIN lock on saving preferences', () => {
    it('keeps the mode on when a save tries to turn it off without the PIN', async () => {
        signInAs('parent')
        const res = await putMode('parent', false)
        expect(res.status).toBe(200)
        expect((await res.json()).childSafetyKept).toBe(true)
        expect(await storedMode('parent')).toBe(true)
    })

    it('lets the save right after a correct PIN turn it off, once', async () => {
        signInAs('parent')
        const wrong = await pinPOST(
            json('POST', '/api/child-safety/pin?action=verify', { pin: '0000' })
        )
        expect(wrong.status).toBe(401)
        await putMode('parent', false)
        expect(await storedMode('parent')).toBe(true)

        const ok = await pinPOST(
            json('POST', '/api/child-safety/pin?action=verify', { pin: '4321' })
        )
        expect(ok.status).toBe(200)
        await putMode('parent', false)
        expect(await storedMode('parent')).toBe(false)

        // The unlock is spent: turned back on, it is locked again.
        await putMode('parent', true)
        await putMode('parent', false)
        expect(await storedMode('parent')).toBe(true)
    })

    it('does not let resetting preferences switch it off', async () => {
        signInAs('parent')
        const res = await prefsDELETE(json('DELETE', '/api/user/preferences'))
        expect((await res.json()).preferences.childSafetyMode).toBe(true)
        expect(await storedMode('parent')).toBe(true)
    })

    it('leaves an account without a PIN free to turn it off', async () => {
        signInAs('nopin')
        await putMode('nopin', false)
        expect(await storedMode('nopin')).toBe(false)
    })
})
