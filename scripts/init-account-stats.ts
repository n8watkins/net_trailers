/**
 * Initialize Account Statistics
 *
 * This script counts existing Firebase Auth users and initializes the system/stats
 * Firestore document with the correct account count.
 */

// Load environment variables FIRST
import './load-env'

import { getAdminAuth, getAdminDb } from '../lib/firebase-admin'

async function initializeAccountStats() {
    console.log('\n' + '='.repeat(70))
    console.log('📊 INITIALIZING ACCOUNT STATISTICS')
    console.log('='.repeat(70))

    try {
        // Get Firebase Admin instances
        const auth = getAdminAuth()
        const db = getAdminDb()

        console.log('\n🔍 Counting existing Firebase Auth users...')

        // List all users
        let userCount = 0
        let pageToken: string | undefined

        do {
            const listUsersResult = await auth.listUsers(1000, pageToken)
            userCount += listUsersResult.users.length
            pageToken = listUsersResult.pageToken

            console.log(`   Found ${listUsersResult.users.length} users in this batch...`)
        } while (pageToken)

        console.log(`\n✅ Total users in Firebase Auth: ${userCount}`)

        // Update system/stats document
        console.log('\n💾 Updating system/stats document in Firestore...')

        const systemStatsRef = db.doc('system/stats')
        const existingDoc = await systemStatsRef.get()

        if (existingDoc.exists) {
            console.log('   Document exists, updating totalAccounts...')
            console.log(`   Previous count: ${existingDoc.data()?.totalAccounts || 0}`)
        } else {
            console.log('   Document does not exist, creating...')
        }

        await systemStatsRef.set(
            {
                totalAccounts: userCount,
                signupsToday: 0,
                lastSignup: null,
                lastReset: Date.now(),
                updatedAt: Date.now(),
            },
            { merge: true }
        )

        console.log(`   ✅ Updated system/stats with totalAccounts: ${userCount}`)

        // Verify the update
        const updatedDoc = await systemStatsRef.get()
        const data = updatedDoc.data()

        console.log('\n📋 Final system/stats document:')
        console.log(`   totalAccounts: ${data?.totalAccounts}`)
        console.log(`   signupsToday: ${data?.signupsToday}`)
        console.log(
            `   lastSignup: ${data?.lastSignup ? new Date(data.lastSignup).toISOString() : 'null'}`
        )
        console.log(`   lastReset: ${new Date(data?.lastReset).toISOString()}`)

        console.log('\n✅ Account statistics initialized successfully!')
        console.log('\n💡 Next steps:')
        console.log('   1. The admin panel should now show the correct account count')
        console.log('   2. Make sure useAuth.tsx calls recordAccountCreation for new signups')
        console.log('   3. Test by creating a new account and checking the admin panel')
    } catch (error) {
        console.error('\n❌ Error initializing account stats:', error)
        throw error
    }
}

// Run the script
initializeAccountStats()
    .then(() => {
        console.log('\n' + '='.repeat(70))
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error)
        process.exit(1)
    })
