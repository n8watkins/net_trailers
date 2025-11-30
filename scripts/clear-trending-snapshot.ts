#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import admin from 'firebase-admin'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey,
        }),
    })
}

const db = admin.firestore()

async function clearSnapshot() {
    // Clear the trending snapshot so next run finds "new" items
    await db.doc('system/trending').delete()

    console.log('✅ Cleared trending snapshot')
    console.log('   Next cron run will treat all current trending items as "new"')
    process.exit(0)
}

clearSnapshot()
