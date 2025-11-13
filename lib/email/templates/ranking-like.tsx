import * as React from 'react'
import { BaseEmail } from './base-email'

interface RankingLikeEmailProps {
    userName?: string
    rankingTitle: string
    rankingId: string
    likerNames: string[] // Array of names of people who liked
    totalLikes: number
}

/**
 * Ranking like notification email
 * Sent when someone likes a user's ranking (batched daily)
 */
export const RankingLikeEmail = ({
    userName,
    rankingTitle,
    rankingId,
    likerNames,
    totalLikes,
}: RankingLikeEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const rankingUrl = `${appUrl}/rankings/${rankingId}`

    const displayNames = likerNames.slice(0, 3)
    const othersCount = likerNames.length - 3

    return (
        <BaseEmail
            userName={userName}
            title="Your Ranking Got Some Love! ❤️"
            subtitle="Community Engagement"
            ctaButton={{
                text: 'View Ranking',
                url: rankingUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                Your ranking <strong style={{ color: '#e50914' }}>"{rankingTitle}"</strong> received{' '}
                {likerNames.length === 1 ? 'a new like' : `${likerNames.length} new likes`}!
            </p>

            <div
                style={{
                    backgroundColor: '#141414',
                    border: '1px solid #313131',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '30px',
                }}
            >
                <div
                    style={{
                        fontSize: '48px',
                        marginBottom: '15px',
                    }}
                >
                    ❤️
                </div>
                <div
                    style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#e50914',
                        marginBottom: '10px',
                    }}
                >
                    {totalLikes.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: '#b3b3b3' }}>
                    Total {totalLikes === 1 ? 'Like' : 'Likes'}
                </div>
            </div>

            <div
                style={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '20px',
                }}
            >
                <div style={{ fontSize: '13px', color: '#808080', marginBottom: '10px' }}>
                    Recently liked by:
                </div>
                {displayNames.map((name, index) => (
                    <div
                        key={index}
                        style={{
                            fontSize: '15px',
                            color: '#e5e5e5',
                            marginBottom: '6px',
                            paddingLeft: '10px',
                        }}
                    >
                        • <strong style={{ color: '#e50914' }}>{name}</strong>
                    </div>
                ))}
                {othersCount > 0 && (
                    <div
                        style={{
                            fontSize: '14px',
                            color: '#b3b3b3',
                            marginTop: '10px',
                            paddingLeft: '10px',
                        }}
                    >
                        ...and <strong style={{ color: '#e50914' }}>{othersCount}</strong>{' '}
                        {othersCount === 1 ? 'other' : 'others'}
                    </div>
                )}
            </div>

            <p style={{ fontSize: '14px', color: '#b3b3b3' }}>
                Your rankings are resonating with the community! Keep sharing your unique
                perspectives on movies and TV shows.
            </p>

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '13px', color: '#808080' }}>
                Like notifications are sent daily to avoid overwhelming you. Manage your
                notification preferences in your settings.
            </p>
        </BaseEmail>
    )
}
