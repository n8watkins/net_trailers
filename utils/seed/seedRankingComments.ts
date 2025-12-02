/**
 * Seed Ranking Comments
 *
 * Creates realistic comments on rankings from different demo profiles
 * to simulate community engagement
 */

import type { CreateCommentRequest } from '../../types/rankings'

export interface CommentTemplate {
    text: string
    type: 'ranking' | 'position'
    positionNumber?: number
    replies?: string[] // Reply text templates
}

/**
 * Comment templates for various scenarios
 * These will be randomly assigned to rankings
 */
export const COMMENT_TEMPLATES: CommentTemplate[] = [
    // Overall ranking comments
    {
        text: "Love this ranking! Your taste is impeccable. I'd maybe swap the top 2 but overall solid list.",
        type: 'ranking',
        replies: [
            'Thanks! Yeah I went back and forth on the top 2 for a while.',
            'Appreciate it! What would you put at #1?',
        ],
    },
    {
        text: "Interesting choices! Some of these I haven't seen yet, adding to my watchlist.",
        type: 'ranking',
        replies: [
            "Thanks! Definitely check out the top 3, they're must-watches.",
            'Let me know what you think after you watch them!',
        ],
    },
    {
        text: 'Solid ranking but I think you missed some key entries. What about some of the classics?',
        type: 'ranking',
        replies: [
            'Fair point! This was more of a personal favorites list than a definitive ranking.',
            'I tried to balance old and new, but yeah could use more classics.',
        ],
    },
    {
        text: "This is a controversial take and I'm here for it! Bold choices.",
        type: 'ranking',
        replies: [
            "Haha thanks! Life's too short for safe rankings 😄",
            "I know it's divisive but I stand by it!",
        ],
    },
    {
        text: 'Finally someone who gets it! This is basically my exact ranking too.',
        type: 'ranking',
        replies: ['Great minds think alike! 🙌', 'Nice to find someone with good taste 😊'],
    },
    {
        text: 'Respectfully disagree with most of this list, but I appreciate the effort you put into it!',
        type: 'ranking',
        replies: ['Fair enough! What would your top 5 be?', 'No worries, rankings are subjective!'],
    },
    {
        text: 'The descriptions for each entry are spot on. Really helped me understand your reasoning.',
        type: 'ranking',
        replies: ['Thanks! I wanted to explain my thought process.', 'Glad it was helpful!'],
    },
    {
        text: "I'm surprised to see this at the top but after thinking about it, it makes sense.",
        type: 'ranking',
        replies: [
            "It's a grower! Wasn't my favorite at first either.",
            'Yeah it took me a second watch to really appreciate it.',
        ],
    },
    {
        text: 'This ranking introduced me to some hidden gems. Thank you for sharing!',
        type: 'ranking',
        replies: [
            "That's awesome! That was my goal with this list.",
            'So glad you found something new to enjoy!',
        ],
    },
    {
        text: "Can't believe you left out [X]! That's a must-have for any list in this category.",
        type: 'ranking',
        replies: [
            'I know, I know! It was a tough cut. Limited spots.',
            "Good point, maybe I'll revise this later.",
        ],
    },

    // Position-specific comments
    {
        text: 'This is WAY too high. Good movie, but not top 3 material.',
        type: 'position',
        positionNumber: 1,
        replies: [
            "I can see why you'd think that, but it's personal preference!",
            "It's my #1 for a reason! Changed my perspective on cinema.",
        ],
    },
    {
        text: 'This is perfect at this position. Exactly where it belongs.',
        type: 'position',
        positionNumber: 2,
        replies: ['Thanks! I debated this one a lot.', 'Glad someone agrees! 😊'],
    },
    {
        text: 'Surprised to see this so low. I would have put it in the top 3.',
        type: 'position',
        positionNumber: 8,
        replies: [
            "It's still great! Just had to make room for my absolute favorites.",
            'Valid point. Maybe I should reconsider.',
        ],
    },
    {
        text: 'Absolutely deserves this spot. Such an underrated gem.',
        type: 'position',
        positionNumber: 5,
        replies: [
            "Right?! Doesn't get enough love.",
            'Thank you! More people need to see this one.',
        ],
    },
    {
        text: 'This one hits different. The emotional impact is just on another level.',
        type: 'position',
        positionNumber: 1,
        replies: ['YES! The ending still makes me cry every time.', "Exactly why it's at the top!"],
    },
]

/**
 * Shorter, reaction-style comments without replies
 */
export const SHORT_COMMENTS: string[] = [
    'Great list! 🔥',
    '100% agree with this',
    'Excellent taste!',
    'This is it. Perfect ranking.',
    'Bold choices, I like it',
    'Interesting take!',
    'Nailed it 👏',
    'This is the one',
    "Can't argue with this",
    'Based ranking',
    'Finally a good list',
    'This goes hard',
    'Impeccable taste',
    'No notes, perfect',
    "Couldn't have said it better",
]

export interface SeedCommentsOptions {
    rankingId: string
    rankingOwnerId: string
    commentingProfiles: Array<{
        userId: string
        userName: string
        userAvatar?: string
    }>
    commentCount?: number // How many comments to create (default: 2-5)
}

/**
 * Seed comments for a specific ranking from different profiles
 */
export async function seedRankingComments(options: SeedCommentsOptions): Promise<void> {
    const { rankingId, rankingOwnerId, commentingProfiles, commentCount } = options

    // Filter out the ranking owner from commenters
    const validCommenters = commentingProfiles.filter((p) => p.userId !== rankingOwnerId)

    if (validCommenters.length === 0) {
        console.log('    ⏭️  No valid commenters for this ranking')
        return
    }

    // Determine number of comments (random between 2 and commentCount, or 2-5 if not specified)
    const targetComments = commentCount || Math.floor(Math.random() * 4) + 2 // 2-5 comments
    const actualComments = Math.min(targetComments, validCommenters.length)

    console.log(`    💬 Adding ${actualComments} comments to ranking ${rankingId}`)

    // Shuffle commenters and templates
    const shuffledCommenters = [...validCommenters].sort(() => Math.random() - 0.5)
    const shuffledTemplates = [...COMMENT_TEMPLATES].sort(() => Math.random() - 0.5)

    const { useRankingStore } = await import('../../stores/rankingStore')

    // Create comments
    for (let i = 0; i < actualComments; i++) {
        const commenter = shuffledCommenters[i]

        // 70% chance of detailed comment, 30% chance of short reaction
        const useShortComment = Math.random() < 0.3

        try {
            if (useShortComment) {
                // Short reaction comment
                const commentText =
                    SHORT_COMMENTS[Math.floor(Math.random() * SHORT_COMMENTS.length)]

                const request: CreateCommentRequest = {
                    rankingId,
                    type: 'ranking',
                    text: commentText,
                }

                await useRankingStore
                    .getState()
                    .createComment(
                        commenter.userId,
                        commenter.userName,
                        commenter.userAvatar,
                        request
                    )

                console.log(`      ✅ Short comment from ${commenter.userName}`)
            } else {
                // Detailed comment with possible reply
                const template = shuffledTemplates[i % shuffledTemplates.length]

                const request: CreateCommentRequest = {
                    rankingId,
                    type: template.type,
                    positionNumber: template.positionNumber,
                    text: template.text,
                }

                await useRankingStore
                    .getState()
                    .createComment(
                        commenter.userId,
                        commenter.userName,
                        commenter.userAvatar,
                        request
                    )

                console.log(`      ✅ Comment from ${commenter.userName}`)

                // 50% chance of owner replying
                if (template.replies && template.replies.length > 0 && Math.random() < 0.5) {
                    // Small delay to ensure comment is created
                    await new Promise((resolve) => setTimeout(resolve, 300))

                    // Load comments to get the comment ID
                    await useRankingStore.getState().loadComments(rankingId)
                    const comments = useRankingStore.getState().comments

                    // Find the comment we just created
                    const parentComment = comments.find(
                        (c) => c.userId === commenter.userId && c.text === template.text
                    )

                    if (parentComment) {
                        // Get owner info - need to find the owner profile
                        const ownerProfile = commentingProfiles.find(
                            (p) => p.userId === rankingOwnerId
                        )

                        if (ownerProfile) {
                            const replyText =
                                template.replies[
                                    Math.floor(Math.random() * template.replies.length)
                                ]

                            const replyRequest: CreateCommentRequest = {
                                rankingId,
                                type: 'ranking',
                                text: replyText,
                                parentCommentId: parentComment.id,
                            }

                            await useRankingStore
                                .getState()
                                .createComment(
                                    ownerProfile.userId,
                                    ownerProfile.userName,
                                    ownerProfile.userAvatar,
                                    replyRequest
                                )

                            console.log(`        ↳ Reply from ${ownerProfile.userName}`)
                        }
                    }
                }
            }

            // Small delay between comments
            await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
            console.error(`      ❌ Failed to create comment from ${commenter.userName}:`, error)
        }
    }
}

/**
 * Seed likes on rankings from different profiles
 */
export async function seedRankingLikes(options: {
    rankingId: string
    rankingOwnerId: string
    likingProfiles: Array<{
        userId: string
        userName: string
    }>
    likeCount?: number // How many likes to create (default: 50-80% of profiles)
}): Promise<void> {
    const { rankingId, rankingOwnerId, likingProfiles, likeCount } = options

    // Filter out the ranking owner from likers
    const validLikers = likingProfiles.filter((p) => p.userId !== rankingOwnerId)

    if (validLikers.length === 0) {
        return
    }

    // Determine number of likes (default: 50-80% of available profiles)
    const defaultLikeCount = Math.floor(
        validLikers.length * (0.5 + Math.random() * 0.3) // 50-80%
    )
    const targetLikes = likeCount !== undefined ? likeCount : defaultLikeCount
    const actualLikes = Math.min(targetLikes, validLikers.length)

    console.log(`    ❤️  Adding ${actualLikes} likes to ranking ${rankingId}`)

    // Shuffle and select random likers
    const shuffledLikers = [...validLikers].sort(() => Math.random() - 0.5)
    const selectedLikers = shuffledLikers.slice(0, actualLikes)

    const { useRankingStore } = await import('../../stores/rankingStore')

    // Create likes
    for (const liker of selectedLikers) {
        try {
            await useRankingStore.getState().likeRanking(liker.userId, rankingId, liker.userName)
            // Small delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
            console.error(`      ❌ Failed to create like from ${liker.userName}:`, error)
        }
    }
}
