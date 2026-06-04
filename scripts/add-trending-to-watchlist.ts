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

async function addTrendingToWatchlist() {
    const userId = 'BHhkBGx80DRfGaAzn7RVM4dqRgP2'

    // Add actually trending movies to watchlist
    const trendingWatchlist = [
        {
            id: 1084242,
            media_type: 'movie',
            title: 'Zootopia 2',
            poster_path: '/vPl6sY0dG0tYBu2RcqRJaYTCCCF.jpg',
            addedAt: Date.now(),
        },
        {
            id: 701387,
            media_type: 'movie',
            title: 'Bugonia',
            poster_path: '/vbJShLaNBtLQZXvYGkfCJqRKwm3.jpg',
            addedAt: Date.now(),
        },
        {
            id: 967941,
            media_type: 'movie',
            title: 'Wicked: For Good',
            poster_path: '/zwl7A1ODPBzxiqQ1GXhZRHBApnH.jpg',
            addedAt: Date.now(),
        },
    ]

    await db.collection('users').doc(userId).update({
        watchlist: trendingWatchlist,
    })

    console.log('✅ Updated watchlist with currently trending movies:')
    trendingWatchlist.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.title} (ID: ${item.id})`)
    })
    console.log('\n📧 User should now receive trending notifications!')
    process.exit(0)
}

addTrendingToWatchlist()
