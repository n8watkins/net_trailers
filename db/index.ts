/**
 * Drizzle database client (Turso / libSQL).
 *
 * Server-only. All database access must go through API routes / server code -
 * unlike Firestore, the client cannot talk to Turso directly.
 *
 * The client is created lazily on first use, so importing this module (for
 * example while `next build` collects route configuration) does not require
 * TURSO_DATABASE_URL. A missing URL still fails loudly on the first query.
 */

import { createClient } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'

import * as schema from './schema'

export type Database = LibSQLDatabase<typeof schema>

let instance: Database | undefined

function getDb(): Database {
    if (!instance) {
        const url = process.env.TURSO_DATABASE_URL
        if (!url) {
            throw new Error(
                'TURSO_DATABASE_URL is not set. Add it to your environment (see .env.example).'
            )
        }
        const client = createClient({
            url,
            authToken: process.env.TURSO_AUTH_TOKEN,
        })
        instance = drizzle(client, { schema })
    }
    return instance
}

// The proxy target shares LibSQLDatabase's prototype so type checks such as the
// Auth.js Drizzle adapter's `is(db, BaseSQLiteDatabase)` pass without
// connecting. Every property read is forwarded to the real client.
export const db: Database = new Proxy(Object.create(LibSQLDatabase.prototype) as Database, {
    get(_target, prop) {
        const real = getDb()
        const value = Reflect.get(real, prop, real)
        return typeof value === 'function' ? value.bind(real) : value
    },
})

export { schema }
