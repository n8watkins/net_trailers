/**
 * Delete Test User Rankings
 *
 * Deletes all rankings created by the test user
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { db, auth } from '../firebase'
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'

const TEST_USER_ID = 'yk8OnMO8r8NgJipst8jclngjj3o1'

async function deleteTestRankings() {
    console.log('🗑️  Deleting test user rankings...\n')

    try {
        // Authenticate
        console.log('🔐 Authenticating...')
        await signInWithEmailAndPassword(auth, 'test@nettrailer.dev', 'TestPassword123!')
        console.log('✅ Authenticated\n')

        // Query rankings by test user
        const rankingsRef = collection(db, 'rankings')
        const q = query(rankingsRef, where('userId', '==', TEST_USER_ID))
        const snapshot = await getDocs(q)

        console.log(`📊 Found ${snapshot.size} rankings to delete\n`)

        if (snapshot.size === 0) {
            console.log('No rankings to delete')
            process.exit(0)
        }

        // Delete each ranking
        for (const doc of snapshot.docs) {
            await deleteDoc(doc.ref)
            console.log(`✅ Deleted: ${doc.id}`)
        }

        console.log(`\n🎉 Successfully deleted ${snapshot.size} rankings`)
        process.exit(0)
    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

deleteTestRankings()
