/**
 * @jest-environment node
 *
 * Deleting an account removes the user's uploaded images (R2, faked here) as
 * well as their database rows, never touches another user's images, and stops
 * with the account intact when the images cannot be deleted.
 */

import { readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import { eq, sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import type { UploadBucket } from '@/lib/uploads'

import { DELETE } from '@/app/api/user/delete-account/route'

// The account delete runs in a transaction, and libSQL gives a transaction its
// own connection: with `:memory:` that is a separate, empty database. A file
// works. The client is created on first query, after this line runs.
const dbFile = path.join(tmpdir(), `nettrailers-delete-account-${process.pid}-${Date.now()}.db`)
process.env.TURSO_DATABASE_URL = `file:${dbFile}`
afterAll(() => rmSync(dbFile, { force: true }))

/** An in-memory stand-in for the R2 bucket: sorted keys, paged listing, batch delete. */
class FakeBucket implements UploadBucket {
    keys = new Set<string>()
    listCalls = 0
    failDelete = false
    onDelete?: () => void

    async list({
        prefix,
        cursor,
        limit = 1000,
    }: {
        prefix: string
        cursor?: string
        limit?: number
    }) {
        this.listCalls++
        const all = [...this.keys].filter((k) => k.startsWith(prefix)).sort()
        const start = cursor ? all.findIndex((k) => k > cursor) : 0
        const page = start === -1 ? [] : all.slice(start, start + limit)
        const truncated = start !== -1 && start + limit < all.length
        return {
            objects: page.map((key) => ({ key })),
            truncated,
            cursor: truncated ? page[page.length - 1] : undefined,
        }
    }

    async delete(keys: string | string[]) {
        if (this.failDelete) throw new Error('R2 unavailable')
        for (const key of Array.isArray(keys) ? keys : [keys]) this.keys.delete(key)
        this.onDelete?.()
    }
}

let bucket: FakeBucket | undefined
jest.mock('@/lib/cloudflare/env', () => ({
    cloudflareEnv: () => (bucket ? { UPLOADS: bucket } : undefined),
}))

const mockAuth = auth as unknown as jest.Mock

function signInAs(userId: string) {
    mockAuth.mockResolvedValue({
        user: { id: userId, email: `${userId}@test.dev` },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
    })
}

const request = () =>
    new NextRequest('https://nt.example/api/user/delete-account', { method: 'DELETE' })

async function userExists(id: string) {
    return (await db.select().from(users).where(eq(users.id, id))).length === 1
}

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
})

beforeEach(async () => {
    bucket = new FakeBucket()
    for (const id of ['alice', 'al', 'bob']) {
        await db
            .insert(users)
            .values({ id, email: `${id}@test.dev` })
            .onConflictDoNothing()
    }
})

afterEach(() => {
    jest.spyOn(console, 'error').mockRestore()
})

describe('DELETE /api/user/delete-account', () => {
    it("deletes the user's uploads, every page of them, and only theirs", async () => {
        for (let i = 0; i < 2_500; i++)
            bucket!.keys.add(`uploads/alice/${String(i).padStart(5, '0')}.webp`)
        bucket!.keys.add('uploads/al/keep.webp') // a user id that is a prefix of another
        bucket!.keys.add('uploads/bob/keep.png')
        bucket!.keys.add('uploads/alice-x/keep.png')
        signInAs('alice')

        const res = await DELETE(request())

        expect(res.status).toBe(200)
        expect([...bucket!.keys].sort()).toEqual([
            'uploads/al/keep.webp',
            'uploads/alice-x/keep.png',
            'uploads/bob/keep.png',
        ])
        expect(await userExists('alice')).toBe(false)
        expect(await userExists('bob')).toBe(true)
    })

    it('keeps the account when the images cannot be deleted, so it can be retried', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined)
        bucket!.keys.add('uploads/bob/a.png')
        bucket!.failDelete = true
        signInAs('bob')

        const res = await DELETE(request())

        expect(res.status).toBe(500)
        expect((await res.json()).error).toMatch(/not deleted/)
        expect(await userExists('bob')).toBe(true)
        expect(bucket!.keys.has('uploads/bob/a.png')).toBe(true)

        // The retry goes through.
        bucket!.failDelete = false
        expect((await DELETE(request())).status).toBe(200)
        expect(bucket!.keys.size).toBe(0)
        expect(await userExists('bob')).toBe(false)
    })

    it('sweeps again after the database delete, for an upload that landed in between', async () => {
        bucket!.keys.add('uploads/al/first.png')
        bucket!.onDelete = () => {
            bucket!.onDelete = undefined
            bucket!.keys.add('uploads/al/late.png')
        }
        signInAs('al')

        expect((await DELETE(request())).status).toBe(200)
        expect(bucket!.keys.size).toBe(0)
        expect(await userExists('al')).toBe(false)
    })

    it('deletes the account off Workers, where no upload can exist', async () => {
        bucket = undefined
        await db.insert(users).values({ id: 'dev', email: 'dev@test.dev' })
        signInAs('dev')

        expect((await DELETE(request())).status).toBe(200)
        expect(await userExists('dev')).toBe(false)
    })
})
