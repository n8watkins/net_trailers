#!/usr/bin/env tsx

/**
 * Test Script: Create Notification
 *
 * Creates test notifications in Firestore to verify the notification system.
 * Useful for testing the cron job and notification UI.
 *
 * Usage:
 *   npm run test:notification -- --userId=YOUR_USER_ID
 *   npm run test:notification -- --userId=YOUR_USER_ID --type=trending_update
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import admin from 'firebase-admin'
import { Notification, NotificationType } from '../types/notifications'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Firebase Admin
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
        console.error('❌ Missing Firebase Admin credentials in .env.local')
        console.error('   Required: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY')
        process.exit(1)
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey,
        }),
    })
}

const db = admin.firestore()

// Sample notification templates (excluding collection_update per user preference)
const NOTIFICATION_TEMPLATES: Partial<
    Record<
        NotificationType,
        Omit<Notification, 'id' | 'userId' | 'createdAt' | 'expiresAt' | 'isRead'>
    >
> = {
    trending_update: {
        type: 'trending_update',
        title: '🔥 Watchlist Item Trending!',
        message: 'The Matrix is now #3 in trending movies',
        contentId: 603,
        mediaType: 'movie',
        actionUrl: '/trending',
        imageUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    },
    new_release: {
        type: 'new_release',
        title: '🎬 New Release Available',
        message: 'Dune: Part Three is now available to watch',
        contentId: 123456,
        mediaType: 'movie',
        actionUrl: '/movie/123456',
        imageUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    },
    system: {
        type: 'system',
        title: '📢 System Announcement',
        message: 'Welcome to NetTrailers! Check out our new features.',
        actionUrl: '/settings',
    },
}

async function createNotification(
    userId: string,
    type: NotificationType = 'trending_update'
): Promise<void> {
    try {
        console.log(`\n📝 Creating ${type} notification for user: ${userId}`)

        const template = NOTIFICATION_TEMPLATES[type]
        const now = Date.now()
        const expiresAt = now + 30 * 24 * 60 * 60 * 1000 // 30 days

        const notificationRef = db.collection('users').doc(userId).collection('notifications').doc()

        const notification: Notification = {
            id: notificationRef.id,
            userId,
            ...template,
            isRead: false,
            createdAt: now,
            expiresAt,
        }

        await notificationRef.set(notification)

        console.log('✅ Notification created successfully!')
        console.log('   ID:', notification.id)
        console.log('   Type:', notification.type)
        console.log('   Title:', notification.title)
        console.log('   Message:', notification.message)

        if (notification.contentId) {
            console.log('   Content ID:', notification.contentId)
            console.log('   Media Type:', notification.mediaType)
        }

        if (notification.collectionId) {
            console.log('   Collection ID:', notification.collectionId)
        }

        if (notification.actionUrl) {
            console.log('   Action URL:', notification.actionUrl)
        }

        console.log('   Created At:', new Date(notification.createdAt).toLocaleString())
        console.log('   Expires At:', new Date(notification.expiresAt).toLocaleString())
    } catch (error) {
        console.error('❌ Error creating notification:', error)
        throw error
    }
}

async function createMultipleNotifications(userId: string, count: number = 5): Promise<void> {
    console.log(`\n📝 Creating ${count} test notifications...`)

    const types: NotificationType[] = ['trending_update', 'new_release', 'system']

    for (let i = 0; i < count; i++) {
        const type = types[i % types.length]
        await createNotification(userId, type)
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`\n✅ Created ${count} notifications successfully!`)
}

async function listUserNotifications(userId: string): Promise<void> {
    console.log(`\n📋 Listing notifications for user: ${userId}`)

    const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

    if (snapshot.empty) {
        console.log('   No notifications found')
        return
    }

    console.log(`   Found ${snapshot.size} notifications:\n`)

    snapshot.forEach((doc, index) => {
        const data = doc.data() as Notification
        console.log(`   ${index + 1}. [${data.type}] ${data.title}`)
        console.log(`      ${data.message}`)
        console.log(
            `      Read: ${data.isRead ? '✓' : '✗'} | Created: ${new Date(data.createdAt).toLocaleString()}`
        )
        console.log()
    })
}

// Parse command line arguments
const args = process.argv.slice(2)
const userId = args.find((arg) => arg.startsWith('--userId='))?.split('=')[1]
const type = args.find((arg) => arg.startsWith('--type='))?.split('=')[1] as NotificationType
const count = parseInt(args.find((arg) => arg.startsWith('--count='))?.split('=')[1] || '1')
const list = args.includes('--list')

// Main execution
async function main() {
    if (!userId) {
        console.error('❌ Missing required --userId parameter')
        console.log('\nUsage:')
        console.log('  npm run test:notification -- --userId=YOUR_USER_ID')
        console.log('  npm run test:notification -- --userId=YOUR_USER_ID --type=trending_update')
        console.log('  npm run test:notification -- --userId=YOUR_USER_ID --count=5')
        console.log('  npm run test:notification -- --userId=YOUR_USER_ID --list')
        console.log('\nAvailable types:')
        console.log('  - trending_update')
        console.log('  - new_release')
        console.log('  - system')
        process.exit(1)
    }

    try {
        if (list) {
            await listUserNotifications(userId)
        } else if (count > 1) {
            await createMultipleNotifications(userId, count)
        } else {
            await createNotification(userId, type)
        }

        console.log('\n🎉 Done!')
        process.exit(0)
    } catch (error) {
        console.error('\n❌ Script failed:', error)
        process.exit(1)
    }
}

main()
