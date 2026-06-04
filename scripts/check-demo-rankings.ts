/**
 * Check Demo Rankings and Comments
 * Verifies that demo rankings exist and have actual comment documents
 */

// Load environment variables
import './load-env'

import { db, auth } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'

async function checkRankings() {
    console.log('🔍 Checking demo rankings and comments...\n')

    // Authenticate
    try {
        await signInWithEmailAndPassword(auth, 'test@nettrailer.dev', 'TestPassword123!')
        console.log('✅ Authenticated\n')
    } catch (error) {
        console.error('❌ Auth failed:', error)
        return
    }

    // Get all demo rankings
    const rankingsQuery = query(
        collection(db, 'rankings'),
        where('userId', '>=', 'demo_'),
        where('userId', '<', 'demo`')
    )

    const rankingsSnap = await getDocs(rankingsQuery)
    console.log(`Found ${rankingsSnap.size} demo rankings:\n`)

    if (rankingsSnap.empty) {
        console.log('No demo rankings found!')
        return
    }

    for (const doc of rankingsSnap.docs) {
        const data = doc.data()
        console.log(`📊 "${data.title}" by ${data.userName}`)
        console.log(`   Ranking doc comments field: ${data.comments}`)
        console.log(`   Likes: ${data.likes}, Views: ${data.views}`)

        // Check if comments actually exist
        const commentsQuery = query(
            collection(db, 'ranking_comments'),
            where('rankingId', '==', doc.id)
        )
        const commentsSnap = await getDocs(commentsQuery)
        console.log(`   ✅ Actual comments in DB: ${commentsSnap.size}`)

        if (commentsSnap.size > 0) {
            commentsSnap.docs.forEach((commentDoc) => {
                const comment = commentDoc.data()
                console.log(`      💬 ${comment.userName}: "${comment.text.substring(0, 50)}..."`)
            })
        }
        console.log('')
    }
}

checkRankings()
    .then(() => {
        console.log('\n✅ Check complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
