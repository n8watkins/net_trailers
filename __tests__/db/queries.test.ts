/**
 * @jest-environment node
 *
 * Drizzle query-layer tests against an in-memory libSQL database. The generated
 * migration is applied once, then the real query modules are exercised.
 */

import { readFileSync, readdirSync } from 'fs'
import path from 'path'

import { sql } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import {
    clearUserPreferences,
    loadUserPreferences,
    saveUserPreferences,
} from '@/db/queries/userPreferences'
import { clearPIN, hasPIN, setPIN, verifyPIN } from '@/db/queries/childSafety'

beforeAll(async () => {
    // Apply the generated Drizzle migration to the in-memory DB.
    const migDir = path.join(process.cwd(), 'db/migrations')
    const sqlFile = readdirSync(migDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()[0]
    const text = readFileSync(path.join(migDir, sqlFile), 'utf-8')
    const statements = text
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
    for (const stmt of statements) {
        await db.run(sql.raw(stmt))
    }

    // A user row to satisfy foreign keys.
    await db.insert(users).values({ id: 'u1', email: 'u1@test.dev' })
})

describe('userPreferences queries', () => {
    it('creates default preferences on first load', async () => {
        const prefs = await loadUserPreferences('u1')
        expect(prefs.defaultWatchlist).toEqual([])
        expect(prefs.autoMute).toBe(true)
    })

    it('saves and reloads preferences (round-trip)', async () => {
        const prefs = await loadUserPreferences('u1')
        await saveUserPreferences('u1', { ...prefs, autoMute: false, defaultVolume: 33 })
        const reloaded = await loadUserPreferences('u1')
        expect(reloaded.autoMute).toBe(false)
        expect(reloaded.defaultVolume).toBe(33)
    })

    it('clears preferences back to defaults', async () => {
        await saveUserPreferences('u1', {
            ...(await loadUserPreferences('u1')),
            childSafetyMode: true,
        })
        const cleared = await clearUserPreferences('u1')
        expect(cleared.childSafetyMode).toBe(false)
        expect(cleared.autoMute).toBe(true)
    })
})

describe('childSafety PIN (bcrypt, server-side)', () => {
    it('sets, verifies, rejects a wrong PIN, and clears', async () => {
        expect(await hasPIN('u1')).toBe(false)

        await setPIN('u1', '1234')
        expect(await hasPIN('u1')).toBe(true)

        const ok = await verifyPIN('u1', '1234')
        expect(ok.success).toBe(true)

        const bad = await verifyPIN('u1', '9999')
        expect(bad.success).toBe(false)

        await clearPIN('u1')
        expect(await hasPIN('u1')).toBe(false)
    })

    it('never exposes the bcrypt hash to callers', async () => {
        await setPIN('u1', '4321')
        const result = await verifyPIN('u1', '4321')
        expect(JSON.stringify(result)).not.toContain('$2') // no bcrypt hash prefix
        await clearPIN('u1')
    })
})
