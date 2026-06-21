import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit does not auto-load .env.local; load it explicitly.
config({ path: '.env.local' })

export default defineConfig({
    schema: './db/schema.ts',
    out: './db/migrations',
    dialect: 'turso',
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    },
})
