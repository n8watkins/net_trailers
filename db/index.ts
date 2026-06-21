/**
 * Drizzle database client (Turso / libSQL).
 *
 * Server-only. All database access must go through API routes / server code —
 * unlike Firestore, the client cannot talk to Turso directly.
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './schema'

const url = process.env.TURSO_DATABASE_URL
if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set. Add it to your environment (see .env.example).')
}

const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })

export { schema }
export type Database = typeof db
