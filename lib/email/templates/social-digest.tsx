import * as React from 'react'
import { BaseEmail } from './base-email'

interface SocialInteraction {
    type: 'comment' | 'like'
    rankingId: string
    rankingTitle: string
    // For comments
    commenterName?: string
    commentText?: string
    commentId?: string
    isReply?: boolean
    parentCommentText?: string
    // For likes
    likerNames?: string[]
}

interface SocialDigestEmailProps {
    userName: string
    interactions: SocialInteraction[]
    unsubscribeToken?: string
}

/**
 * Daily Social Digest Email
 * Batches all ranking comments and likes from the past 24 hours
 */
export const SocialDigestEmail = ({
    userName,
    interactions,
    unsubscribeToken,
}: SocialDigestEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Unsubscribe URL - use token if available, otherwise go to settings
    const unsubscribeUrl = unsubscribeToken
        ? `${appUrl}/api/email/unsubscribe?token=${unsubscribeToken}`
        : `${appUrl}/settings/notifications`

    // Group interactions by ranking
    const rankingGroups = interactions.reduce(
        (acc, interaction) => {
            if (!acc[interaction.rankingId]) {
                acc[interaction.rankingId] = {
                    rankingTitle: interaction.rankingTitle,
                    rankingId: interaction.rankingId,
                    comments: [],
                    likes: [],
                }
            }
            if (interaction.type === 'comment') {
                acc[interaction.rankingId].comments.push(interaction)
            } else {
                acc[interaction.rankingId].likes.push(interaction)
            }
            return acc
        },
        {} as Record<
            string,
            {
                rankingTitle: string
                rankingId: string
                comments: SocialInteraction[]
                likes: SocialInteraction[]
            }
        >
    )

    const totalComments = interactions.filter((i) => i.type === 'comment').length
    const totalLikes = interactions.filter((i) => i.type === 'like').length

    return (
        <BaseEmail
            userName={userName}
            title="Your Rankings Got Some Action! 🎬"
            subtitle="Daily Social Digest"
            ctaButton={{
                text: 'View Your Rankings',
                url: `${appUrl}/community?filter=my-rankings`,
            }}
        >
            <p style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                In the past 24 hours, your rankings received{' '}
                {totalComments > 0 && (
                    <>
                        <strong style={{ color: '#e50914' }}>
                            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                        </strong>
                    </>
                )}
                {totalComments > 0 && totalLikes > 0 && ' and '}
                {totalLikes > 0 && (
                    <>
                        <strong style={{ color: '#e50914' }}>
                            {totalLikes} {totalLikes === 1 ? 'like' : 'likes'}
                        </strong>
                    </>
                )}
                !
            </p>

            {Object.values(rankingGroups).map((group) => {
                const rankingUrl = `${appUrl}/rankings/${group.rankingId}`
                const hasComments = group.comments.length > 0
                const hasLikes = group.likes.length > 0

                return (
                    <div
                        key={group.rankingId}
                        style={{
                            backgroundColor: '#141414',
                            border: '1px solid #313131',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '20px',
                        }}
                    >
                        {/* Ranking Title */}
                        <h2
                            style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#ffffff',
                                marginTop: '0',
                                marginBottom: '16px',
                            }}
                        >
                            <a
                                href={rankingUrl}
                                style={{
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                }}
                            >
                                "{group.rankingTitle}"
                            </a>
                        </h2>

                        {/* Likes Section */}
                        {hasLikes && (
                            <div style={{ marginBottom: hasComments ? '16px' : '0' }}>
                                <p
                                    style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '14px',
                                        color: '#b3b3b3',
                                    }}
                                >
                                    <strong style={{ color: '#e50914' }}>❤️ Likes:</strong>
                                </p>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: '#d4d4d4',
                                    }}
                                >
                                    {group.likes
                                        .flatMap((like) => like.likerNames || [])
                                        .slice(0, 5)
                                        .join(', ')}
                                    {group.likes.flatMap((like) => like.likerNames || []).length >
                                        5 && (
                                        <span style={{ color: '#8c8c8c' }}>
                                            {' '}
                                            and{' '}
                                            {group.likes.flatMap((like) => like.likerNames || [])
                                                .length - 5}{' '}
                                            others
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Comments Section */}
                        {hasComments && (
                            <div>
                                <p
                                    style={{
                                        margin: '0 0 12px 0',
                                        fontSize: '14px',
                                        color: '#b3b3b3',
                                    }}
                                >
                                    <strong style={{ color: '#e50914' }}>💬 Comments:</strong>
                                </p>
                                {group.comments.map((comment, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #2a2a2a',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            marginBottom:
                                                idx < group.comments.length - 1 ? '8px' : '0',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 6px 0',
                                                fontSize: '13px',
                                                color: '#e50914',
                                                fontWeight: '600',
                                            }}
                                        >
                                            {comment.commenterName}
                                            {comment.isReply && (
                                                <span
                                                    style={{ color: '#8c8c8c', fontWeight: '400' }}
                                                >
                                                    {' '}
                                                    replied to your comment
                                                </span>
                                            )}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0',
                                                fontSize: '13px',
                                                color: '#d4d4d4',
                                                lineHeight: '1.4',
                                            }}
                                        >
                                            "{comment.commentText}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* View Ranking Button */}
                        <div style={{ marginTop: '16px' }}>
                            <a
                                href={rankingUrl}
                                style={{
                                    display: 'inline-block',
                                    padding: '8px 16px',
                                    backgroundColor: '#E50914',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                }}
                            >
                                View Ranking →
                            </a>
                        </div>
                    </div>
                )
            })}

            {/* Footer with unsubscribe */}
            <div
                style={{
                    marginTop: '32px',
                    paddingTop: '20px',
                    borderTop: '1px solid #313131',
                    fontSize: '12px',
                    color: '#8c8c8c',
                    textAlign: 'center',
                }}
            >
                <p style={{ margin: '0 0 12px 0' }}>
                    You're receiving this because you have social notifications enabled.
                </p>
                <p style={{ margin: '0' }}>
                    <a
                        href={`${appUrl}/settings/notifications`}
                        style={{ color: '#8c8c8c', textDecoration: 'none', marginRight: '12px' }}
                    >
                        Manage Preferences
                    </a>
                    <span style={{ color: '#4a4a4a' }}>•</span>
                    <a
                        href={unsubscribeUrl}
                        style={{ color: '#8c8c8c', textDecoration: 'none', marginLeft: '12px' }}
                    >
                        Unsubscribe
                    </a>
                </p>
            </div>
        </BaseEmail>
    )
}
