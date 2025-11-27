import * as React from 'react'
import { BaseEmail } from './base-email'
import { Content } from '../../../typings'
import { getTitle, getYear, getReleaseDate } from '../../../typings'

interface NewReleaseEmailProps {
    userName?: string
    releases: Content[]
}

/**
 * New release notification email
 * Sent when content from user's watchlist is released
 */
export const NewReleaseEmail = ({ userName, releases }: NewReleaseEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <BaseEmail
            userName={userName}
            title="Items from Your Watchlist Are Now Available!"
            subtitle="Watchlist Update"
            ctaButton={{
                text: 'View Watchlist',
                url: `${appUrl}/collections/watch-later`,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                Great news! <strong style={{ color: '#ffffff' }}>{releases.length}</strong>{' '}
                {releases.length === 1 ? 'item' : 'items'} from your watchlist{' '}
                {releases.length === 1 ? 'has' : 'have'} been released!
            </p>

            {releases.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    {releases.slice(0, 5).map((item) => {
                        const releaseDate = getReleaseDate(item)
                        return (
                            <div
                                key={item.id}
                                style={{
                                    backgroundColor: '#141414',
                                    border: '1px solid #313131',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    marginBottom: '15px',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        backgroundColor: '#e50914',
                                        color: '#ffffff',
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    NEW
                                </div>
                                <div
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '8px',
                                        paddingRight: '60px',
                                    }}
                                >
                                    {getTitle(item)}
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: '#b3b3b3',
                                        marginBottom: '10px',
                                    }}
                                >
                                    {releaseDate && `Released ${releaseDate}`}
                                    {item.vote_average &&
                                        ` • ⭐ ${item.vote_average.toFixed(1)}/10`}
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
                                        {item.overview.length > 150
                                            ? `${item.overview.substring(0, 150)}...`
                                            : item.overview}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {releases.length > 5 && (
                <p
                    style={{
                        fontSize: '14px',
                        color: '#b3b3b3',
                        textAlign: 'center',
                        marginTop: '20px',
                    }}
                >
                    ...and <strong style={{ color: '#e50914' }}>{releases.length - 5} more</strong>{' '}
                    new releases!
                </p>
            )}

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '13px', color: '#808080' }}>
                We'll notify you when items from your watchlist become available. Manage your
                watchlist notification preferences in your settings.
            </p>
        </BaseEmail>
    )
}
