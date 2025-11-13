import * as React from 'react'
import { BaseEmail } from './base-email'

interface RankingCommentEmailProps {
    userName?: string
    rankingTitle: string
    rankingId: string
    commenterName: string
    commentText: string
    commentId: string
    isReply?: boolean
    parentCommentText?: string
}

/**
 * Ranking comment notification email
 * Sent when someone comments on a user's ranking or replies to their comment
 */
export const RankingCommentEmail = ({
    userName,
    rankingTitle,
    rankingId,
    commenterName,
    commentText,
    commentId,
    isReply = false,
    parentCommentText,
}: RankingCommentEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const rankingUrl = `${appUrl}/rankings/${rankingId}#comment-${commentId}`

    return (
        <BaseEmail
            userName={userName}
            title={isReply ? 'New Reply to Your Comment' : 'New Comment on Your Ranking'}
            subtitle="Community Engagement"
            ctaButton={{
                text: 'View Comment',
                url: rankingUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#e50914' }}>{commenterName}</strong>{' '}
                {isReply ? 'replied to your comment' : 'commented'} on your ranking{' '}
                <strong style={{ color: '#ffffff' }}>"{rankingTitle}"</strong>
            </p>

            {isReply && parentCommentText && (
                <div
                    style={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #2a2a2a',
                        borderLeft: '3px solid #505050',
                        borderRadius: '6px',
                        padding: '14px',
                        marginBottom: '15px',
                    }}
                >
                    <div style={{ fontSize: '12px', color: '#808080', marginBottom: '6px' }}>
                        Your comment:
                    </div>
                    <div
                        style={{
                            fontSize: '14px',
                            color: '#b3b3b3',
                            lineHeight: '1.5',
                            fontStyle: 'italic',
                        }}
                    >
                        "
                        {parentCommentText.length > 100
                            ? `${parentCommentText.substring(0, 100)}...`
                            : parentCommentText}
                        "
                    </div>
                </div>
            )}

            <div
                style={{
                    backgroundColor: '#141414',
                    border: '1px solid #313131',
                    borderLeft: '3px solid #e50914',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '20px',
                }}
            >
                <div style={{ fontSize: '13px', color: '#b3b3b3', marginBottom: '10px' }}>
                    <strong style={{ color: '#e50914' }}>{commenterName}</strong> said:
                </div>
                <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: '1.6' }}>
                    "{commentText}"
                </div>
            </div>

            <p style={{ fontSize: '14px', color: '#b3b3b3' }}>
                Click the button above to view the full conversation and reply.
            </p>

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '13px', color: '#808080' }}>
                Stay engaged with your community! You can manage your comment notification
                preferences in your settings.
            </p>
        </BaseEmail>
    )
}
