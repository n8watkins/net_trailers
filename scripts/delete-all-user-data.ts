/**
 * Delete all user data from Firestore
 * WARNING: This is irreversible!
 *
 * This script deletes all Firestore user documents but keeps Firebase Auth users.
 * Users will get fresh new schema on next login.
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { db } from '../firebase'
import { collection, getDocs, deleteDoc } from 'firebase/firestore'

async function deleteAllUserData() {
    console.log('\n' + '█'.repeat(70))
    console.log('⚠️  WARNING: DELETE ALL USER DATA')
    console.log('█'.repeat(70))

    console.log('\n🔍 This will:')
    console.log('   ✓ Delete all Firestore user documents (users collection)')
    console.log('   ✓ Keep Firebase Auth users (they can still sign in)')
    console.log('   ✓ Users will get new schema on next login')
    console.log('\n⚠️  This operation is IRREVERSIBLE!')

    try {
        // Get all user documents
        console.log('\n📚 Fetching all user documents...')
        const usersRef = collection(db, 'users')
        const snapshot = await getDocs(usersRef)

        console.log(`   Found ${snapshot.docs.length} user documents`)

        if (snapshot.docs.length === 0) {
            console.log('\n✅ No user data to delete')
            return
        }

        // Delete each user document
        console.log('\n🗑️  Deleting user documents...')
        let deleted = 0
        let failed = 0

        for (const doc of snapshot.docs) {
            try {
                await deleteDoc(doc.ref)
                console.log(`   ✅ Deleted: ${doc.id}`)
                deleted++
            } catch (error) {
                console.error(`   ❌ Failed to delete ${doc.id}:`, error)
                failed++
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70))
        console.log('📊 DELETION SUMMARY')
        console.log('='.repeat(70))
        console.log(`   Successfully deleted: ${deleted}`)
        console.log(`   Failed: ${failed}`)
        console.log(`   Total processed: ${snapshot.docs.length}`)

        if (deleted > 0) {
            console.log('\n' + '█'.repeat(70))
            console.log('🎉 USER DATA DELETED SUCCESSFULLY!')
            console.log('█'.repeat(70))

            console.log('\n✅ Next steps:')
            console.log('   1. Deploy new schema code')
            console.log('   2. Users will get fresh new schema on next login')
            console.log('   3. Recreate test user: npm run test:create-user')
        }

        if (failed > 0) {
            console.log('\n⚠️  Some deletions failed. Check errors above.')
        }
    } catch (error: any) {
        console.error('\n' + '█'.repeat(70))
        console.error('❌ DELETION FAILED')
        console.error('█'.repeat(70))
        console.error(`\nError: ${error.message}`)
        console.error('\nStack:', error.stack)
        throw error
    }
}

// Run the script
deleteAllUserData()
    .then(() => {
        console.log('\n✅ Script completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error.message)
        process.exit(1)
    })
