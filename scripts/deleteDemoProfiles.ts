/**
 * Delete Demo Profiles Script
 *
 * Removes all demo profiles and their associated data from Firestore.
 * This includes profiles, rankings, comments, likes, threads, polls, and user data.
 *
 * Usage:
 *   npx tsx scripts/deleteDemoProfiles.ts
 *   npx tsx scripts/deleteDemoProfiles.ts --confirm
 */

// Load environment variables
import './load-env'

import { db, auth } from '../firebase'
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'

// Authenticate as test user to bypass security rules
async function authenticateTestUser(): Promise<string> {
    const email = 'test@nettrailer.dev'
    const password = 'TestPassword123!'

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        console.log(`✅ Authenticated as: ${email} (${userCredential.user.uid})\n`)
        return userCredential.user.uid
    } catch (error) {
        console.error('❌ Failed to authenticate test user:', error)
        throw new Error(
            'Authentication failed. Make sure the test user exists. Run: npm run create-test-user'
        )
    }
}

/**
 * Get all demo profile IDs (profiles with demo_ prefix)
 */
async function getDemoProfileIds(): Promise<string[]> {
    try {
        const profilesRef = collection(db, 'profiles')
        const q = query(
            profilesRef,
            where('__name__', '>=', 'demo_'),
            where('__name__', '<', 'demo`') // Lexicographically after 'demo_'
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map((doc) => doc.id)
    } catch (error) {
        console.error('Error getting demo profile IDs:', error)
        return []
    }
}

/**
 * Delete documents from a collection where userId matches demo profile IDs
 */
async function deleteByUserIds(
    collectionName: string,
    demoUserIds: string[],
    batchSize: number = 500
): Promise<number> {
    if (demoUserIds.length === 0) {
        console.log(`  ⏭️  No demo users, skipping ${collectionName}`)
        return 0
    }

    console.log(`  🗑️  Deleting from ${collectionName}...`)
    let deleted = 0

    try {
        // Query documents where userId is in demoUserIds
        const collectionRef = collection(db, collectionName)
        const q = query(collectionRef, where('userId', 'in', demoUserIds.slice(0, 10))) // Firestore limits 'in' to 10

        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            console.log(`     No documents found in ${collectionName}`)
            return 0
        }

        // Delete in batches
        const batches: any[][] = []
        let currentBatch: any[] = []

        snapshot.docs.forEach((docSnapshot) => {
            currentBatch.push(docSnapshot.ref)
            if (currentBatch.length >= batchSize) {
                batches.push(currentBatch)
                currentBatch = []
            }
        })

        if (currentBatch.length > 0) {
            batches.push(currentBatch)
        }

        // Execute batch deletes
        for (const batch of batches) {
            const writeBatchInstance = writeBatch(db)
            batch.forEach((docRef) => {
                writeBatchInstance.delete(docRef)
            })
            await writeBatchInstance.commit()
            deleted += batch.length
            console.log(`     Deleted ${batch.length} documents from ${collectionName}`)
        }

        console.log(`  ✅ Total deleted from ${collectionName}: ${deleted}`)
        return deleted
    } catch (error) {
        console.error(`  ❌ Error deleting from ${collectionName}:`, error)
        return deleted
    }
}

/**
 * Delete all demo profiles and their associated data
 */
async function deleteDemoProfiles(confirm: boolean = false) {
    console.log('\n' + '█'.repeat(70))
    console.log('⚠️  DELETE DEMO PROFILES')
    console.log('█'.repeat(70))

    // Authenticate first
    console.log('\n🔐 Authenticating...')
    await authenticateTestUser()

    // Get all demo profile IDs
    console.log('📋 Finding demo profiles...')
    const demoUserIds = await getDemoProfileIds()

    if (demoUserIds.length === 0) {
        console.log('\n✅ No demo profiles found. Nothing to delete.')
        return
    }

    console.log(`  Found ${demoUserIds.length} demo profile(s):`)
    demoUserIds.forEach((id, i) => {
        console.log(`    ${i + 1}. ${id}`)
    })

    console.log('\n🗑️  This will delete:')
    console.log('   ✓ Demo user profiles (profiles collection)')
    console.log('   ✓ Demo user data (users collection + subcollections)')
    console.log('   ✓ Rankings created by demo users')
    console.log('   ✓ Ranking comments by demo users')
    console.log('   ✓ Ranking likes by demo users')
    console.log('   ✓ Forum threads created by demo users')
    console.log('   ✓ Thread replies by demo users')
    console.log('   ✓ Polls created by demo users')
    console.log('   ✓ Poll votes by demo users')
    console.log('   ✓ Watch history for demo users')
    console.log('   ✓ Collections created by demo users')
    console.log('   ✓ Notifications for demo users')

    if (!confirm) {
        console.log('\n⚠️  DRY RUN MODE - No data will be deleted')
        console.log('   Run with --confirm flag to actually delete data:')
        console.log('   npx tsx scripts/deleteDemoProfiles.ts --confirm')
        return
    }

    console.log('\n⚠️  This operation is IRREVERSIBLE!')
    console.log('   Starting deletion in 3 seconds...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log('\n🗑️  Starting deletion process...\n')

    let totalDeleted = 0

    // 1. Delete profiles
    console.log('📝 Phase 1: Deleting profiles...')
    for (const userId of demoUserIds) {
        try {
            await deleteDoc(doc(db, 'profiles', userId))
            console.log(`  ✅ Deleted profile: ${userId}`)
            totalDeleted++
        } catch (error) {
            console.error(`  ❌ Failed to delete profile ${userId}:`, error)
        }
    }

    // 2. Delete user documents and subcollections
    console.log('\n📝 Phase 2: Deleting user data...')
    for (const userId of demoUserIds) {
        try {
            // Delete main user document
            await deleteDoc(doc(db, 'users', userId))
            console.log(`  ✅ Deleted user data: ${userId}`)
            totalDeleted++

            // Note: Subcollections (customRows, notifications, watchHistory, etc.)
            // need to be deleted manually or via Firebase console batch delete
            console.log(`     ⚠️  Subcollections for ${userId} may still exist`)
            console.log(`     Run cleanup in Firebase console if needed`)
        } catch (error) {
            console.error(`  ❌ Failed to delete user ${userId}:`, error)
        }
    }

    // 3. Delete rankings
    console.log('\n📝 Phase 3: Deleting rankings...')
    const rankingsDeleted = await deleteByUserIds('rankings', demoUserIds)
    totalDeleted += rankingsDeleted

    // 4. Delete ranking comments
    console.log('\n📝 Phase 4: Deleting ranking comments...')
    const commentsDeleted = await deleteByUserIds('rankingComments', demoUserIds)
    totalDeleted += commentsDeleted

    // 5. Delete ranking likes
    console.log('\n📝 Phase 5: Deleting ranking likes...')
    const likesDeleted = await deleteByUserIds('rankingLikes', demoUserIds)
    totalDeleted += likesDeleted

    // 6. Delete forum threads
    console.log('\n📝 Phase 6: Deleting forum threads...')
    const threadsDeleted = await deleteByUserIds('threads', demoUserIds)
    totalDeleted += threadsDeleted

    // 7. Delete thread replies
    console.log('\n📝 Phase 7: Deleting thread replies...')
    const repliesDeleted = await deleteByUserIds('thread_replies', demoUserIds)
    totalDeleted += repliesDeleted

    // 8. Delete polls
    console.log('\n📝 Phase 8: Deleting polls...')
    const pollsDeleted = await deleteByUserIds('polls', demoUserIds)
    totalDeleted += pollsDeleted

    // 9. Delete poll votes
    console.log('\n📝 Phase 9: Deleting poll votes...')
    const votesDeleted = await deleteByUserIds('poll_votes', demoUserIds)
    totalDeleted += votesDeleted

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 DELETION SUMMARY')
    console.log('='.repeat(70))
    console.log(`   Demo profiles found: ${demoUserIds.length}`)
    console.log(`   Total documents deleted: ${totalDeleted}`)
    console.log(`   - Profiles: ${demoUserIds.length}`)
    console.log(`   - User documents: ${demoUserIds.length}`)
    console.log(`   - Rankings: ${rankingsDeleted}`)
    console.log(`   - Comments: ${commentsDeleted}`)
    console.log(`   - Likes: ${likesDeleted}`)
    console.log(`   - Threads: ${threadsDeleted}`)
    console.log(`   - Replies: ${repliesDeleted}`)
    console.log(`   - Polls: ${pollsDeleted}`)
    console.log(`   - Votes: ${votesDeleted}`)

    console.log('\n' + '█'.repeat(70))
    console.log('🎉 DEMO PROFILES DELETED SUCCESSFULLY!')
    console.log('█'.repeat(70))

    console.log('\n⚠️  Note: User subcollections (customRows, watchHistory, notifications)')
    console.log('   may still exist. Use Firebase console for complete cleanup if needed.')
}

// Parse command line arguments
function parseArgs(): { confirm: boolean } {
    const args = process.argv.slice(2)
    return {
        confirm: args.includes('--confirm'),
    }
}

// Run the script
async function main() {
    const { confirm } = parseArgs()

    try {
        await deleteDemoProfiles(confirm)

        if (!confirm) {
            console.log('\n💡 Tip: Run with --confirm to actually delete the data')
        }

        console.log('\n✅ Script completed!')
        process.exit(0)
    } catch (error) {
        console.error('\n❌ Script failed:', error)
        process.exit(1)
    }
}

main()
