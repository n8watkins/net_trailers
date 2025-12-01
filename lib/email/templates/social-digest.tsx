import * as React from 'react'

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
 * Premium Netflix-caliber Weekly Social Digest Email
 * Redesigned with table-based layout for maximum email client compatibility
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
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <title>Your Rankings Got Some Action!</title>
            </head>
            <body
                style={{
                    margin: '0',
                    padding: '0',
                    backgroundColor: '#0a0a0a',
                    fontFamily:
                        '"Helvetica Neue", Helvetica, Arial, -apple-system, BlinkMacSystemFont, sans-serif',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                }}
            >
                <table
                    cellPadding="0"
                    cellSpacing="0"
                    border={0}
                    width="100%"
                    style={{ backgroundColor: '#0a0a0a' }}
                >
                    <tr>
                        <td align="center" style={{ padding: '40px 20px' }}>
                            {/* Main Container */}
                            <table
                                cellPadding="0"
                                cellSpacing="0"
                                border={0}
                                width="600"
                                style={{ maxWidth: '600px', width: '100%' }}
                            >
                                {/* View in Browser Link */}
                                <tr>
                                    <td
                                        align="right"
                                        style={{
                                            fontSize: '13px',
                                            paddingBottom: '20px',
                                        }}
                                    >
                                        <a
                                            href={`${appUrl}/community?filter=my-rankings`}
                                            style={{
                                                color: '#E50914',
                                                textDecoration: 'none',
                                                fontWeight: '600',
                                            }}
                                        >
                                            View in browser →
                                        </a>
                                    </td>
                                </tr>

                                {/* Header / Logo */}
                                <tr>
                                    <td
                                        align="center"
                                        style={{
                                            paddingBottom: '32px',
                                            borderBottom: '3px solid #E50914',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '36px',
                                                fontWeight: '900',
                                                color: '#E50914',
                                                letterSpacing: '3px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            NET TRAILERS
                                        </div>
                                    </td>
                                </tr>

                                {/* Hero Section */}
                                <tr>
                                    <td style={{ padding: '32px 0 24px 0' }}>
                                        {/* Greeting */}
                                        <div
                                            style={{
                                                fontSize: '18px',
                                                color: '#b3b3b3',
                                                marginBottom: '10px',
                                                fontWeight: '500',
                                            }}
                                        >
                                            Hey {userName}! 🎉
                                        </div>

                                        {/* Main Headline */}
                                        <h1
                                            style={{
                                                fontSize: '28px',
                                                fontWeight: '900',
                                                color: '#ffffff',
                                                margin: '0 0 12px 0',
                                                lineHeight: '1.2',
                                            }}
                                        >
                                            Your Rankings Got Some Action! 🎬
                                        </h1>

                                        {/* Subheadline */}
                                        <p
                                            style={{
                                                fontSize: '15px',
                                                color: '#b3b3b3',
                                                margin: '0',
                                                lineHeight: '1.5',
                                            }}
                                        >
                                            This week your rankings received{' '}
                                            {totalComments > 0 && (
                                                <>
                                                    <strong style={{ color: '#E50914' }}>
                                                        {totalComments}{' '}
                                                        {totalComments === 1
                                                            ? 'comment'
                                                            : 'comments'}
                                                    </strong>
                                                </>
                                            )}
                                            {totalComments > 0 && totalLikes > 0 && ' and '}
                                            {totalLikes > 0 && (
                                                <>
                                                    <strong style={{ color: '#E50914' }}>
                                                        {totalLikes}{' '}
                                                        {totalLikes === 1 ? 'like' : 'likes'}
                                                    </strong>
                                                </>
                                            )}
                                            . Here's what people are saying!
                                        </p>
                                    </td>
                                </tr>

                                {/* Rankings Section */}
                                {Object.values(rankingGroups).map((group) => {
                                    const rankingUrl = `${appUrl}/rankings/${group.rankingId}`
                                    const hasComments = group.comments.length > 0
                                    const hasLikes = group.likes.length > 0
                                    const allLikerNames = group.likes.flatMap(
                                        (like) => like.likerNames || []
                                    )

                                    return (
                                        <tr key={group.rankingId}>
                                            <td style={{ padding: '0 0 16px 0' }}>
                                                <table
                                                    cellPadding="0"
                                                    cellSpacing="0"
                                                    border={0}
                                                    width="100%"
                                                    style={{
                                                        backgroundColor: '#181818',
                                                        borderRadius: '8px',
                                                        border: '1px solid #2a2a2a',
                                                    }}
                                                >
                                                    <tr>
                                                        <td
                                                            style={{
                                                                padding: '20px',
                                                            }}
                                                        >
                                                            {/* Ranking Title */}
                                                            <div
                                                                style={{
                                                                    fontSize: '20px',
                                                                    fontWeight: '700',
                                                                    color: '#ffffff',
                                                                    marginBottom: '16px',
                                                                    lineHeight: '1.3',
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
                                                            </div>

                                                            {/* Likes Section */}
                                                            {hasLikes && (
                                                                <div
                                                                    style={{
                                                                        marginBottom: hasComments
                                                                            ? '16px'
                                                                            : '0',
                                                                        padding: '12px',
                                                                        backgroundColor: '#0a0a0a',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #2a2a2a',
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            fontSize: '13px',
                                                                            color: '#E50914',
                                                                            fontWeight: '700',
                                                                            marginBottom: '6px',
                                                                        }}
                                                                    >
                                                                        ❤️ LIKES
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            color: '#d4d4d4',
                                                                            lineHeight: '1.5',
                                                                        }}
                                                                    >
                                                                        {allLikerNames
                                                                            .slice(0, 5)
                                                                            .join(', ')}
                                                                        {allLikerNames.length >
                                                                            5 && (
                                                                            <span
                                                                                style={{
                                                                                    color: '#8c8c8c',
                                                                                }}
                                                                            >
                                                                                {' '}
                                                                                and{' '}
                                                                                {allLikerNames.length -
                                                                                    5}{' '}
                                                                                others
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Comments Section */}
                                                            {hasComments && (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: '13px',
                                                                            color: '#E50914',
                                                                            fontWeight: '700',
                                                                            marginBottom: '10px',
                                                                        }}
                                                                    >
                                                                        💬 COMMENTS
                                                                    </div>
                                                                    <table
                                                                        cellPadding="0"
                                                                        cellSpacing="0"
                                                                        border={0}
                                                                        width="100%"
                                                                    >
                                                                        {group.comments.map(
                                                                            (comment, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td
                                                                                        style={{
                                                                                            paddingBottom:
                                                                                                idx <
                                                                                                group
                                                                                                    .comments
                                                                                                    .length -
                                                                                                    1
                                                                                                    ? '10px'
                                                                                                    : '0',
                                                                                        }}
                                                                                    >
                                                                                        <table
                                                                                            cellPadding="0"
                                                                                            cellSpacing="0"
                                                                                            border={
                                                                                                0
                                                                                            }
                                                                                            width="100%"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    '#0a0a0a',
                                                                                                border: '1px solid #2a2a2a',
                                                                                                borderRadius:
                                                                                                    '6px',
                                                                                            }}
                                                                                        >
                                                                                            <tr>
                                                                                                <td
                                                                                                    style={{
                                                                                                        padding:
                                                                                                            '12px',
                                                                                                    }}
                                                                                                >
                                                                                                    <div
                                                                                                        style={{
                                                                                                            fontSize:
                                                                                                                '13px',
                                                                                                            color: '#E50914',
                                                                                                            fontWeight:
                                                                                                                '700',
                                                                                                            marginBottom:
                                                                                                                '6px',
                                                                                                        }}
                                                                                                    >
                                                                                                        {
                                                                                                            comment.commenterName
                                                                                                        }
                                                                                                        {comment.isReply && (
                                                                                                            <span
                                                                                                                style={{
                                                                                                                    color: '#8c8c8c',
                                                                                                                    fontWeight:
                                                                                                                        '400',
                                                                                                                }}
                                                                                                            >
                                                                                                                {' '}
                                                                                                                replied
                                                                                                                to
                                                                                                                your
                                                                                                                comment
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div
                                                                                                        style={{
                                                                                                            fontSize:
                                                                                                                '14px',
                                                                                                            color: '#d4d4d4',
                                                                                                            lineHeight:
                                                                                                                '1.5',
                                                                                                        }}
                                                                                                    >
                                                                                                        "
                                                                                                        {
                                                                                                            comment.commentText
                                                                                                        }

                                                                                                        "
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        )}
                                                                    </table>
                                                                </div>
                                                            )}

                                                            {/* View Ranking Button */}
                                                            <div
                                                                style={{
                                                                    marginTop: '16px',
                                                                }}
                                                            >
                                                                <table
                                                                    cellPadding="0"
                                                                    cellSpacing="0"
                                                                    border={0}
                                                                >
                                                                    <tr>
                                                                        <td
                                                                            style={{
                                                                                backgroundColor:
                                                                                    '#E50914',
                                                                                borderRadius: '4px',
                                                                                padding: '8px 16px',
                                                                            }}
                                                                        >
                                                                            <a
                                                                                href={rankingUrl}
                                                                                style={{
                                                                                    color: '#ffffff',
                                                                                    textDecoration:
                                                                                        'none',
                                                                                    fontSize:
                                                                                        '13px',
                                                                                    fontWeight:
                                                                                        '700',
                                                                                    display:
                                                                                        'inline-block',
                                                                                }}
                                                                            >
                                                                                View Ranking →
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {/* Primary CTA Section */}
                                <tr>
                                    <td
                                        align="center"
                                        style={{
                                            padding: '24px 0 28px 0',
                                            borderTop: '1px solid #2a2a2a',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                color: '#ffffff',
                                                marginBottom: '14px',
                                            }}
                                        >
                                            Keep the conversation going!
                                        </div>
                                        <table cellPadding="0" cellSpacing="0" border={0}>
                                            <tr>
                                                <td
                                                    style={{
                                                        backgroundColor: '#E50914',
                                                        borderRadius: '9999px',
                                                        padding: '14px 36px',
                                                    }}
                                                >
                                                    <a
                                                        href={`${appUrl}/community?filter=my-rankings`}
                                                        style={{
                                                            color: '#ffffff',
                                                            textDecoration: 'none',
                                                            fontSize: '15px',
                                                            fontWeight: '700',
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        View All Your Rankings
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                color: '#8c8c8c',
                                                marginTop: '12px',
                                                lineHeight: '1.5',
                                            }}
                                        >
                                            Reply to comments and engage with your community
                                        </div>
                                    </td>
                                </tr>

                                {/* Footer */}
                                <tr>
                                    <td
                                        style={{
                                            borderTop: '1px solid #2a2a2a',
                                            paddingTop: '32px',
                                            paddingBottom: '20px',
                                        }}
                                    >
                                        <table
                                            cellPadding="0"
                                            cellSpacing="0"
                                            border={0}
                                            width="100%"
                                        >
                                            <tr>
                                                <td
                                                    align="center"
                                                    style={{
                                                        fontSize: '13px',
                                                        color: '#666666',
                                                        lineHeight: '1.6',
                                                    }}
                                                >
                                                    <p style={{ margin: '0 0 16px 0' }}>
                                                        You're receiving this email because you
                                                        opted in to NetTrailers social updates.
                                                    </p>
                                                    <p style={{ margin: '0 0 20px 0' }}>
                                                        <a
                                                            href={`${appUrl}/settings/notifications`}
                                                            style={{
                                                                color: '#8c8c8c',
                                                                textDecoration: 'none',
                                                                marginRight: '12px',
                                                            }}
                                                        >
                                                            Manage Preferences
                                                        </a>
                                                        <span style={{ color: '#4a4a4a' }}>•</span>
                                                        <a
                                                            href={unsubscribeUrl}
                                                            style={{
                                                                color: '#8c8c8c',
                                                                textDecoration: 'none',
                                                                marginLeft: '12px',
                                                            }}
                                                        >
                                                            Unsubscribe
                                                        </a>
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: '0',
                                                            color: '#4a4a4a',
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        © {new Date().getFullYear()} NetTrailers.
                                                        All rights reserved.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    )
}
