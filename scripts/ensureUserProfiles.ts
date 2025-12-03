/**
 * Ensure User Profiles Exist
 *
 * Creates profile documents for users who have created rankings
 * but don't have profile documents yet.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (getApps().length === 0) {
    // Try to use service account if available, otherwise use default credentials
    try {
        const serviceAccount = require('../serviceAccountKey.json')
        initializeApp({
            credential: cert(serviceAccount),
        })
    } catch (error) {
        console.log('Service account not found, using default credentials')
        initializeApp()
    }
}

const db = getFirestore()

async function ensureUserProfiles() {
    console.log('🔍 Checking for users without profile documents...\n')

    try {
        // Get all rankings
        const rankingsSnapshot = await db.collection('rankings').get()
        console.log(`Found ${rankingsSnapshot.size} total rankings\n`)

        // Track unique user IDs from rankings
        const userIds = new Set<string>()
        const userInfo = new Map<string, { userName: string; userAvatar?: string }>()

        rankingsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.userId) {
                userIds.add(data.userId)
                if (!userInfo.has(data.userId)) {
                    userInfo.set(data.userId, {
                        userName: data.userName || 'User',
                        userAvatar: data.userAvatar,
                    })
                }
            }
        })

        console.log(`Found ${userIds.size} unique users with rankings\n`)

        // Check which users don't have profile documents
        const usersWithoutProfiles: string[] = []

        for (const userId of userIds) {
            const profileDoc = await db.collection('profiles').doc(userId).get()
            if (!profileDoc.exists) {
                usersWithoutProfiles.push(userId)
            }
        }

        console.log(`Found ${usersWithoutProfiles.length} users without profile documents\n`)

        if (usersWithoutProfiles.length === 0) {
            console.log('✅ All users with rankings have profile documents!')
            return
        }

        // Create profile documents for users without them
        console.log('Creating profile documents...\n')

        let created = 0
        for (const userId of usersWithoutProfiles) {
            const info = userInfo.get(userId)
            if (!info) continue

            // Count user's rankings
            const userRankingsSnapshot = await db
                .collection('rankings')
                .where('userId', '==', userId)
                .get()

            const profileData = {
                id: userId,
                userId: userId,
                email: `${userId}@example.com`, // Placeholder
                username: info.userName.toLowerCase().replace(/\s+/g, '_'),
                displayName: info.userName,
                avatarUrl:
                    info.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
                avatarSource: 'generated',
                description: null,
                favoriteGenres: [],
                rankingsCount: userRankingsSnapshot.size,
                publicCollectionsCount: 0,
                totalLikes: 0,
                totalViews: 0,
                isPublic: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }

            await db.collection('profiles').doc(userId).set(profileData)
            console.log(`  ✅ Created profile for: ${info.userName} (${userId})`)
            created++
        }

        console.log(`\n🎉 Done! Created ${created} profile documents`)
    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

// Run the script
ensureUserProfiles()
    .then(() => {
        console.log('\n✨ Script completed successfully')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error)
        process.exit(1)
    })
