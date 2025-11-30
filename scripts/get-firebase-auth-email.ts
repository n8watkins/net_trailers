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

async function getAuthEmail() {
    const userId = 'BHhkBGx80DRfGaAzn7RVM4dqRgP2'

    try {
        const userRecord = await admin.auth().getUser(userId)
        console.log('\n🔐 Firebase Auth User Info')
        console.log('==========================\n')
        console.log('User ID:', userRecord.uid)
        console.log('Email:', userRecord.email || 'No email')
        console.log('Display Name:', userRecord.displayName || 'No name')
        console.log('Email Verified:', userRecord.emailVerified)
        console.log('Provider:', userRecord.providerData[0]?.providerId || 'Unknown')
    } catch (error) {
        console.error('Error fetching user:', error)
    }

    process.exit(0)
}

getAuthEmail()
