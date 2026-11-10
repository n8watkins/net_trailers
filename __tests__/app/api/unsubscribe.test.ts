/**
 * @jest-environment node
 *
 * One-click unsubscribe turns off the flag every email sender reads, and the
 * link redirects on the site it was opened on.
 */

import { readFileSync, readdirSync } from 'fs'
import path from 'path'

import { sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'

import { db } from '@/db'
import { users } from '@/db/schema'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { GET, POST } from '@/app/api/email/unsubscribe/route'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token'

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
    await db.insert(users).values({ id: 'reader', email: 'reader@example.com' })
})

describe('/api/email/unsubscribe', () => {
    it('POST turns off notifications.email, which the senders check', async () => {
        const prefs = await loadUserPreferences('reader')
        await saveUserPreferences('reader', {
            ...prefs,
            notifications: { ...(prefs.notifications as object), email: true } as never,
        })
        const token = await generateUnsubscribeToken('reader')

        const response = await POST(
            new NextRequest('https://nettrailers.example/api/email/unsubscribe', {
                method: 'POST',
                body: JSON.stringify({ token }),
            })
        )
        expect(response.status).toBe(200)
        const after = await loadUserPreferences('reader')
        expect(after.notifications?.email).toBe(false)
    })

    it('POST refuses an unknown token', async () => {
        const response = await POST(
            new NextRequest('https://nettrailers.example/api/email/unsubscribe', {
                method: 'POST',
                body: JSON.stringify({ token: 'not-a-token' }),
            })
        )
        expect(response.status).toBe(404)
    })

    it('GET redirects to the confirmation page on the same site, token encoded', async () => {
        const response = await GET(
            new NextRequest('https://nettrailers.example/api/email/unsubscribe?token=a%26b%3Dc')
        )
        const location = new URL(response.headers.get('location')!)
        expect(location.origin).toBe('https://nettrailers.example')
        expect(location.pathname).toBe('/unsubscribe')
        expect(location.searchParams.get('token')).toBe('a&b=c')
    })
})
