/**
 * Admin API: Update Test Comments
 *
 * Updates "test" comments with more relatable, realistic comment text.
 * GET /api/admin/update-test-comments
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

const RELATABLE_COMMENTS = [
    "This is a solid list! I'd personally swap positions 3 and 5, but great choices overall.",
    "Love this ranking! Though I think you're sleeping on some of the newer releases.",
    "Interesting take on this. Have you seen the director's cut version? Might change your perspective!",
    'Great picks! The cinematography alone in #2 deserves that spot.',
    'I respect the list but #1 is a hot take for me. Still, really well thought out!',
    'Finally someone who appreciates this properly! Totally agree with your top 3.',
    'This ranking speaks to my soul. The pacing in #4 is absolutely perfect.',
    "Bold choices here! I'm surprised by #6 but I can see where you're coming from.",
    "Couldn't agree more with your #1 pick. That twist ending still haunts me.",
    "Nice! Though I'd move #7 way higher - that soundtrack is legendary.",
]

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    console.log('\n📝 === UPDATING TEST COMMENTS ===\n')

    try {
        const adminDb = getAdminDb()

        // Get all comments
        const commentsSnapshot = await adminDb.collection('ranking_comments').get()

        let updatedCount = 0
        let batch = adminDb.batch()
        let operations = 0

        console.log(`📊 Found ${commentsSnapshot.size} comments\n`)

        for (const commentDoc of commentsSnapshot.docs) {
            const comment = commentDoc.data()
            const text = comment.text || ''

            // Check if it's a test comment (short, generic text)
            const isTestComment =
                text.toLowerCase().startsWith('test') ||
                text.length < 10 ||
                /^[a-z]{1,5}$/.test(text.toLowerCase())

            if (isTestComment) {
                // Pick a random relatable comment
                const newText =
                    RELATABLE_COMMENTS[Math.floor(Math.random() * RELATABLE_COMMENTS.length)]

                console.log(`   📝 Updating comment ${commentDoc.id}:`)
                console.log(`      Old: "${text}"`)
                console.log(`      New: "${newText}"`)

                batch.update(commentDoc.ref, {
                    text: newText,
                })

                operations++
                updatedCount++

                if (operations >= 450) {
                    console.log(`   💾 Committing batch (${operations} operations)...`)
                    await batch.commit()
                    batch = adminDb.batch()
                    operations = 0
                }
            }
        }

        // Commit final batch
        if (operations > 0) {
            console.log(`   💾 Committing final batch (${operations} operations)...`)
            await batch.commit()
        }

        const result = {
            success: true,
            message: 'Test comments updated',
            stats: {
                totalComments: commentsSnapshot.size,
                updated: updatedCount,
            },
        }

        console.log('\n✅ === UPDATE COMPLETE ===')
        console.log(JSON.stringify(result, null, 2))
        console.log('\n')

        return NextResponse.json(result)
    } catch (error) {
        console.error('\n❌ === ERROR! ===')
        console.error(error)
        console.error('\n')

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Update failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        )
    }
}
