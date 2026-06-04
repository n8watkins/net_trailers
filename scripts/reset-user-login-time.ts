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

async function resetLoginTime() {
    const userId = 'BHhkBGx80DRfGaAzn7RVM4dqRgP2'

    // Set lastLoginAt to 0 so user will receive notifications
    await db.collection('users').doc(userId).update({
        lastLoginAt: 0,
    })

    console.log('✅ Reset lastLoginAt to 0')
    console.log('   User will now receive trending notifications on next cron run')
    process.exit(0)
}

resetLoginTime()
