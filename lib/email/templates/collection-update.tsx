import * as React from 'react'
import { BaseEmail } from './base-email'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface CollectionUpdateEmailProps {
    userName?: string
    collectionName: string
    collectionId: string
    newItems: Content[]
    totalNewItems: number
}

/**
 * Collection update notification email
 * Sent when auto-updating collections add new content
 */
export const CollectionUpdateEmail = ({
    userName,
    collectionName,
    collectionId,
    newItems,
    totalNewItems,
}: CollectionUpdateEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const collectionUrl = `${appUrl}/?collection=${collectionId}`

    return (
        <BaseEmail
            userName={userName}
            title={`New Content in "${collectionName}"`}
            subtitle="Collection Update"
            ctaButton={{
                text: 'View Collection',
                url: collectionUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                Your collection <strong style={{ color: '#e50914' }}>"{collectionName}"</strong> has
                been updated with{' '}
                <strong style={{ color: '#ffffff' }}>
                    {totalNewItems} new {totalNewItems === 1 ? 'item' : 'items'}
                </strong>
                !
            </p>

            {newItems.length > 0 && (
                <>
                    <p style={{ fontSize: '16px', color: '#b3b3b3', marginBottom: '15px' }}>
                        Here's what's new:
                    </p>
                    <div style={{ marginBottom: '30px' }}>
                        {newItems.slice(0, 5).map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    backgroundColor: '#141414',
                                    border: '1px solid #313131',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '12px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '6px',
                                    }}
                                >
                                    {getTitle(item)}
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: '#b3b3b3',
                                        marginBottom: '8px',
                                    }}
                                >
                                    {getYear(item)} •{' '}
                                    {item.vote_average
                                        ? `⭐ ${item.vote_average.toFixed(1)}/10`
                                        : 'Not rated yet'}
                                    {item.media_type &&
                                        ` • ${item.media_type === 'movie' ? 'Movie' : 'TV Show'}`}
                                </div>
                                {item.overview && (
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: '#e5e5e5',
                                            lineHeight: '1.5',
                                        }}
                                    >
                                        {item.overview.length > 120
                                            ? `${item.overview.substring(0, 120)}...`
                                            : item.overview}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {totalNewItems > 5 && (
                <p
                    style={{
                        fontSize: '14px',
                        color: '#b3b3b3',
                        textAlign: 'center',
                        marginTop: '20px',
                    }}
                >
                    ...and <strong style={{ color: '#e50914' }}>{totalNewItems - 5} more</strong>!
                </p>
            )}

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '13px', color: '#808080' }}>
                Your auto-updating collections check for new content daily. You can disable
                auto-updates for any collection in your settings.
            </p>
        </BaseEmail>
    )
}
