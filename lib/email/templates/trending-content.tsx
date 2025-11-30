import * as React from 'react'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface TrendingContentEmailProps {
    userName: string
    movies: Content[]
    tvShows: Content[]
}

/**
 * Premium Netflix-caliber Weekly Trending Digest Email
 * Redesigned with table-based layout for maximum email client compatibility
 */
export const TrendingContentEmail = ({ userName, movies, tvShows }: TrendingContentEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const formatRuntime = (content: Content) => {
        if ('runtime' in content && content.runtime) {
            const hours = Math.floor(content.runtime / 60)
            const mins = content.runtime % 60
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
        }
        if ('number_of_seasons' in content && content.number_of_seasons) {
            return `${content.number_of_seasons} ${content.number_of_seasons === 1 ? 'Season' : 'Seasons'}`
        }
        return null
    }

    const getBadgeLabel = (content: Content) => {
        if (content.vote_average && content.vote_average >= 8.0) return 'HIGHLY RATED'
        if (content.vote_average && content.vote_average >= 7.5) return 'TRENDING NOW'
        return 'NEW THIS WEEK'
    }

    const renderContentCard = (content: Content, index: number) => {
        const title = getTitle(content)
        const year = getYear(content)
        const runtime = formatRuntime(content)
        const badgeLabel = getBadgeLabel(content)
        const description = content.overview
            ? content.overview.length > 140
                ? `${content.overview.substring(0, 140)}...`
                : content.overview
            : ''
        const posterUrl = content.poster_path
            ? `https://image.tmdb.org/t/p/w300${content.poster_path}`
            : ''
        const contentUrl = `${appUrl}/${content.media_type}/${content.id}`

        return (
            <tr key={content.id}>
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
                            overflow: 'hidden',
                        }}
                    >
                        <tr>
                            {/* Desktop layout: two columns */}
                            <td
                                style={{
                                    width: '120px',
                                    verticalAlign: 'top',
                                    padding: '0',
                                }}
                            >
                                {posterUrl && (
                                    <a href={contentUrl} style={{ textDecoration: 'none' }}>
                                        <img
                                            src={posterUrl}
                                            alt={`${title} poster`}
                                            width="120"
                                            height="180"
                                            style={{
                                                display: 'block',
                                                width: '120px',
                                                height: '180px',
                                                objectFit: 'cover',
                                                borderRadius: '4px 0 0 4px',
                                            }}
                                        />
                                    </a>
                                )}
                            </td>
                            <td
                                style={{
                                    verticalAlign: 'top',
                                    padding: '16px 20px',
                                }}
                            >
                                {/* Badge */}
                                <table cellPadding="0" cellSpacing="0" border={0}>
                                    <tr>
                                        <td
                                            style={{
                                                backgroundColor: '#E50914',
                                                color: '#ffffff',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                letterSpacing: '0.5px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                display: 'inline-block',
                                                marginBottom: '12px',
                                            }}
                                        >
                                            {badgeLabel}
                                        </td>
                                    </tr>
                                </table>

                                {/* Title */}
                                <div
                                    style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#ffffff',
                                        marginBottom: '6px',
                                        lineHeight: '1.3',
                                    }}
                                >
                                    <a
                                        href={contentUrl}
                                        style={{
                                            color: '#ffffff',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        {title}
                                    </a>
                                </div>

                                {/* Meta info */}
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: '#8c8c8c',
                                        marginBottom: '10px',
                                        fontWeight: '500',
                                    }}
                                >
                                    {year}
                                    {runtime && (
                                        <>
                                            {' '}
                                            <span style={{ color: '#4a4a4a' }}>•</span> {runtime}
                                        </>
                                    )}
                                    {content.vote_average && (
                                        <>
                                            {' '}
                                            <span style={{ color: '#4a4a4a' }}>•</span>{' '}
                                            <span style={{ color: '#ffd700' }}>★</span>{' '}
                                            {content.vote_average.toFixed(1)}
                                        </>
                                    )}
                                </div>

                                {/* Description */}
                                {description && (
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: '#b3b3b3',
                                            lineHeight: '1.5',
                                            marginBottom: '14px',
                                        }}
                                    >
                                        {description}
                                    </div>
                                )}

                                {/* CTA Button */}
                                <table cellPadding="0" cellSpacing="0" border={0}>
                                    <tr>
                                        <td
                                            style={{
                                                backgroundColor: '#E50914',
                                                borderRadius: '4px',
                                                padding: '10px 20px',
                                            }}
                                        >
                                            <a
                                                href={contentUrl}
                                                style={{
                                                    color: '#ffffff',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    display: 'inline-block',
                                                }}
                                            >
                                                View on NetTrailers →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        )
    }

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" />
                <title>Your Weekly NetTrailers Lineup</title>
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
                                            fontSize: '12px',
                                            color: '#666666',
                                            paddingBottom: '20px',
                                        }}
                                    >
                                        <a
                                            href={appUrl}
                                            style={{ color: '#666666', textDecoration: 'none' }}
                                        >
                                            View in browser
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
                                    <td style={{ padding: '40px 0 32px 0' }}>
                                        {/* Greeting */}
                                        <div
                                            style={{
                                                fontSize: '18px',
                                                color: '#b3b3b3',
                                                marginBottom: '12px',
                                                fontWeight: '500',
                                            }}
                                        >
                                            Hello, {userName} 👋
                                        </div>

                                        {/* Main Headline */}
                                        <h1
                                            style={{
                                                fontSize: '32px',
                                                fontWeight: '900',
                                                color: '#ffffff',
                                                margin: '0 0 16px 0',
                                                lineHeight: '1.2',
                                            }}
                                        >
                                            Your Weekly NetTrailers Lineup 🍿
                                        </h1>

                                        {/* Subheadline */}
                                        <p
                                            style={{
                                                fontSize: '16px',
                                                color: '#b3b3b3',
                                                margin: '0',
                                                lineHeight: '1.5',
                                            }}
                                        >
                                            Here's what everyone's watching this week. Your
                                            watchlist called — it wants these added ASAP.
                                        </p>
                                    </td>
                                </tr>

                                {/* Movies Section */}
                                {movies.length > 0 && (
                                    <>
                                        <tr>
                                            <td style={{ paddingBottom: '20px' }}>
                                                <div
                                                    style={{
                                                        fontSize: '24px',
                                                        fontWeight: '700',
                                                        color: '#ffffff',
                                                        paddingBottom: '8px',
                                                        borderBottom: '2px solid #E50914',
                                                        display: 'inline-block',
                                                    }}
                                                >
                                                    🎬 Trending Movies
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <table
                                                    cellPadding="0"
                                                    cellSpacing="0"
                                                    border={0}
                                                    width="100%"
                                                >
                                                    {movies
                                                        .slice(0, 5)
                                                        .map((movie, idx) =>
                                                            renderContentCard(movie, idx)
                                                        )}
                                                </table>
                                            </td>
                                        </tr>
                                    </>
                                )}

                                {/* TV Shows Section */}
                                {tvShows.length > 0 && (
                                    <>
                                        <tr>
                                            <td
                                                style={{
                                                    paddingTop: '24px',
                                                    paddingBottom: '20px',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '24px',
                                                        fontWeight: '700',
                                                        color: '#ffffff',
                                                        paddingBottom: '8px',
                                                        borderBottom: '2px solid #E50914',
                                                        display: 'inline-block',
                                                    }}
                                                >
                                                    📺 Trending TV Shows
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <table
                                                    cellPadding="0"
                                                    cellSpacing="0"
                                                    border={0}
                                                    width="100%"
                                                >
                                                    {tvShows
                                                        .slice(0, 5)
                                                        .map((show, idx) =>
                                                            renderContentCard(show, idx)
                                                        )}
                                                </table>
                                            </td>
                                        </tr>
                                    </>
                                )}

                                {/* Primary CTA Section */}
                                <tr>
                                    <td
                                        align="center"
                                        style={{
                                            padding: '48px 0 32px 0',
                                            borderTop: '1px solid #2a2a2a',
                                            marginTop: '32px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '20px',
                                                fontWeight: '700',
                                                color: '#ffffff',
                                                marginBottom: '16px',
                                            }}
                                        >
                                            Ready for more?
                                        </div>
                                        <table cellPadding="0" cellSpacing="0" border={0}>
                                            <tr>
                                                <td
                                                    style={{
                                                        backgroundColor: '#E50914',
                                                        borderRadius: '9999px',
                                                        padding: '16px 40px',
                                                    }}
                                                >
                                                    <a
                                                        href={appUrl}
                                                        style={{
                                                            color: '#ffffff',
                                                            textDecoration: 'none',
                                                            fontSize: '16px',
                                                            fontWeight: '700',
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        Explore More on NetTrailers
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <div
                                            style={{
                                                fontSize: '14px',
                                                color: '#8c8c8c',
                                                marginTop: '14px',
                                                lineHeight: '1.5',
                                            }}
                                        >
                                            See your full personalized lineup and keep your
                                            watchlist up to date.
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
                                                        opted in to NetTrailers trending updates.
                                                    </p>
                                                    <p style={{ margin: '0 0 20px 0' }}>
                                                        <a
                                                            href={`${appUrl}/settings`}
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
                                                            href={`${appUrl}/unsubscribe`}
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
