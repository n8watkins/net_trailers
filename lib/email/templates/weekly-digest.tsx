import * as React from 'react'
import { BaseEmail } from './base-email'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface WeeklyDigestEmailProps {
    userName: string
    weekStart: string // e.g., "Jan 6"
    weekEnd: string // e.g., "Jan 12"
    stats: {
        watchlistCount: number
        collectionsCount: number
        newRankings: number
        totalInteractions: number
    }
    trendingContent: {
        movies: Content[]
        tvShows: Content[]
    }
    recommendations: Content[]
    collectionUpdates: Array<{
        name: string
        id: string
        newItemsCount: number
    }>
    communityHighlights: Array<{
        type: 'ranking' | 'thread'
        title: string
        author: string
        engagement: number
    }>
}

/**
 * Weekly digest email template
 * Sent weekly with personalized content and activity summary
 */
export const WeeklyDigestEmail = ({
    userName,
    weekStart,
    weekEnd,
    stats,
    trendingContent,
    recommendations,
    collectionUpdates,
    communityHighlights,
}: WeeklyDigestEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <BaseEmail
            userName={userName}
            title={`Your Week in Review: ${weekStart} - ${weekEnd}`}
            subtitle="Weekly Digest"
            ctaButton={{
                text: 'Open Net Trailers',
                url: appUrl,
            }}
        >
            {/* Stats Overview */}
            <div
                style={{
                    backgroundColor: '#141414',
                    border: '1px solid #313131',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '30px',
                }}
            >
                <div
                    style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#ffffff',
                        marginBottom: '20px',
                    }}
                >
                    📊 Your Activity This Week
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '15px',
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#e50914' }}>
                            {stats.watchlistCount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '5px' }}>
                            Watchlist Items
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#e50914' }}>
                            {stats.collectionsCount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '5px' }}>
                            Collections
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#e50914' }}>
                            {stats.newRankings}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '5px' }}>
                            New Rankings
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#e50914' }}>
                            {stats.totalInteractions}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '5px' }}>
                            Interactions
                        </div>
                    </div>
                </div>
            </div>

            {/* Collection Updates */}
            {collectionUpdates.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginTop: '40px',
                            marginBottom: '15px',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        🔄 Collection Updates
                    </div>
                    {collectionUpdates.map((update, index) => (
                        <div
                            key={index}
                            style={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #2a2a2a',
                                borderRadius: '6px',
                                padding: '14px',
                                marginBottom: '10px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    marginBottom: '5px',
                                }}
                            >
                                {update.name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#e50914' }}>
                                +{update.newItemsCount} new{' '}
                                {update.newItemsCount === 1 ? 'item' : 'items'}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Recommended For You */}
            {recommendations.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginTop: '40px',
                            marginBottom: '15px',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        ✨ Recommended For You
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        {recommendations.slice(0, 3).map((item) => (
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
                                    {getYear(item)}
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
                                        {item.overview.length > 100
                                            ? `${item.overview.substring(0, 100)}...`
                                            : item.overview}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Trending Movies */}
            {trendingContent.movies.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginTop: '40px',
                            marginBottom: '15px',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        🎬 Trending Movies
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        {trendingContent.movies.slice(0, 3).map((movie) => (
                            <div
                                key={movie.id}
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    marginBottom: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {getTitle(movie)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#808080' }}>
                                    {getYear(movie)}
                                    {movie.vote_average &&
                                        ` • ⭐ ${movie.vote_average.toFixed(1)}/10`}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Trending TV Shows */}
            {trendingContent.tvShows.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginTop: '40px',
                            marginBottom: '15px',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        📺 Trending TV Shows
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        {trendingContent.tvShows.slice(0, 3).map((show) => (
                            <div
                                key={show.id}
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    marginBottom: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {getTitle(show)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#808080' }}>
                                    {getYear(show)}
                                    {show.vote_average &&
                                        ` • ⭐ ${show.vote_average.toFixed(1)}/10`}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Community Highlights */}
            {communityHighlights.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginTop: '40px',
                            marginBottom: '15px',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        🔥 Community Highlights
                    </div>
                    {communityHighlights.slice(0, 3).map((highlight, index) => (
                        <div
                            key={index}
                            style={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #2a2a2a',
                                borderRadius: '6px',
                                padding: '14px',
                                marginBottom: '10px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    marginBottom: '5px',
                                }}
                            >
                                {highlight.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#b3b3b3' }}>
                                by <strong style={{ color: '#e50914' }}>{highlight.author}</strong>{' '}
                                • {highlight.engagement}{' '}
                                {highlight.type === 'ranking' ? 'likes' : 'replies'}
                            </div>
                        </div>
                    ))}
                </>
            )}

            <div className="divider" style={{ margin: '40px 0' }}></div>

            <p style={{ fontSize: '14px', color: '#b3b3b3', textAlign: 'center' }}>
                That's your week in review! Stay tuned for more personalized content and updates.
            </p>

            <p
                style={{
                    fontSize: '13px',
                    color: '#808080',
                    textAlign: 'center',
                    marginTop: '20px',
                }}
            >
                You're receiving this weekly digest because you're subscribed to email
                notifications. Change your frequency in your settings.
            </p>
        </BaseEmail>
    )
}
