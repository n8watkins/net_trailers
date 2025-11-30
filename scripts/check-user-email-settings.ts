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

async function checkUser() {
    const userId = 'BHhkBGx80DRfGaAzn7RVM4dqRgP2'
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    console.log('\n📧 User Email Notification Settings')
    console.log('====================================\n')
    console.log('Email:', userData?.email || 'No email')
    console.log('Display Name:', userData?.displayName || 'No name')
    console.log('\nNotifications config:')
    console.log(JSON.stringify(userData?.notifications || {}, null, 2))
    console.log('\nWatchlist items:', (userData?.watchlist || []).length)

    // Check if user can receive emails
    const emailEnabled = userData?.notifications?.email ?? false
    const trendingEnabled = userData?.notifications?.types?.trending_update ?? false

    console.log('\n✅ Email Requirements:')
    console.log(`   Email notifications enabled: ${emailEnabled ? '✅' : '❌'}`)
    console.log(`   Trending notifications enabled: ${trendingEnabled ? '✅' : '❌'}`)
    console.log(`   Has email address: ${userData?.email ? '✅' : '❌'}`)
    console.log(`   Has watchlist items: ${(userData?.watchlist || []).length > 0 ? '✅' : '❌'}`)

    process.exit(0)
}

checkUser()
