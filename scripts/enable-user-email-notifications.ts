#!/usr/bin/env tsx

/**
 * Enable Email Notifications for User
 *
 * Sets up a user to receive weekly digest emails:
 * - Enables email notifications
 * - Enables trending_update notifications
 * - Adds test email address if missing
 * - Adds sample watchlist items
 */

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

async function enableEmailNotifications() {
    const args = process.argv.slice(2)
    const userId = args.find((arg) => arg.startsWith('--userId='))?.split('=')[1]
    const email = args.find((arg) => arg.startsWith('--email='))?.split('=')[1]

    if (!userId) {
        console.error('❌ Missing --userId parameter')
        console.log('\nUsage:')
        console.log(
            '  npx tsx scripts/enable-user-email-notifications.ts --userId=YOUR_USER_ID --email=YOUR_EMAIL'
        )
        process.exit(1)
    }

    if (!email) {
        console.error('❌ Missing --email parameter')
        console.log('\nUsage:')
        console.log(
            '  npx tsx scripts/enable-user-email-notifications.ts --userId=YOUR_USER_ID --email=YOUR_EMAIL'
        )
        process.exit(1)
    }

    console.log('\n📧 Enabling Email Notifications')
    console.log('================================\n')
    console.log(`User ID: ${userId}`)
    console.log(`Email: ${email}`)
    console.log()

    try {
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            console.error('❌ User not found')
            process.exit(1)
        }

        const userData = userDoc.data()

        // Update user email and notifications settings
        await userRef.update({
            email,
            'notifications.email': true,
            'notifications.types.trending_update': true,
            'notifications.inApp': true,
        })

        console.log('✅ Updated user settings:')
        console.log('   Email address:', email)
        console.log('   Email notifications: ✅ Enabled')
        console.log('   Trending notifications: ✅ Enabled')
        console.log()

        // Add sample watchlist items if watchlist is empty
        const watchlist = userData?.watchlist || []
        if (watchlist.length === 0) {
            const sampleWatchlist = [
                {
                    id: 603,
                    media_type: 'movie',
                    title: 'The Matrix',
                    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
                    addedAt: Date.now(),
                },
                {
                    id: 550,
                    media_type: 'movie',
                    title: 'Fight Club',
                    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                    addedAt: Date.now(),
                },
                {
                    id: 13,
                    media_type: 'movie',
                    title: 'Forrest Gump',
                    poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
                    addedAt: Date.now(),
                },
            ]

            await userRef.update({
                watchlist: sampleWatchlist,
            })

            console.log('✅ Added sample watchlist items:')
            sampleWatchlist.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.title}`)
            })
            console.log()
        } else {
            console.log(`ℹ️  Watchlist already has ${watchlist.length} items`)
        }

        console.log('🎉 User is now set up to receive weekly digest emails!')
        console.log('\n📝 Next steps:')
        console.log('   1. Run: npm run test:weekly-digest -- --demo')
        console.log('   2. Check your email inbox for the weekly digest')
        console.log()

        process.exit(0)
    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

enableEmailNotifications()
