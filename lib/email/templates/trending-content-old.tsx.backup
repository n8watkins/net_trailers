import * as React from 'react'
import { BaseEmail } from './base-email'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface TrendingContentEmailProps {
    userName: string
    movies: Content[]
    tvShows: Content[]
}

/**
 * Trending content test/demo email template
 * Sent manually by users to test email functionality
 */
export const TrendingContentEmail = ({ userName, movies, tvShows }: TrendingContentEmailProps) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <BaseEmail
            userName={userName}
            title="Trending This Week"
            subtitle="Demo Email"
            ctaButton={{
                text: 'Explore More on Net Trailers',
                url: appUrl,
            }}
        >
            <p style={{ marginBottom: '30px', color: '#b3b3b3' }}>
                This is a demo email showcasing the trending movies and TV shows this week. This
                feature demonstrates our email notification system using Resend.
            </p>

            {movies.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            marginTop: '30px',
                            marginBottom: '20px',
                            color: '#ffffff',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        🎬 Trending Movies
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        {movies.slice(0, 5).map((movie) => (
                            <div
                                key={movie.id}
                                style={{
                                    backgroundColor: '#141414',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    border: '1px solid #313131',
                                    marginBottom: '15px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '8px',
                                    }}
                                >
                                    {getTitle(movie)}
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: '#b3b3b3',
                                        marginBottom: '10px',
                                    }}
                                >
                                    {getYear(movie)} •{' '}
                                    {movie.vote_average
                                        ? `⭐ ${movie.vote_average.toFixed(1)}/10`
                                        : ''}
                                </div>
                                {movie.overview && (
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: '#e5e5e5',
                                            lineHeight: '1.5',
                                        }}
                                    >
                                        {movie.overview.length > 150
                                            ? `${movie.overview.substring(0, 150)}...`
                                            : movie.overview}
                                    </div>
                                )}
                                {movie.vote_average && movie.vote_average >= 7.5 && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            backgroundColor: '#e50914',
                                            color: '#ffffff',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            marginTop: '10px',
                                        }}
                                    >
                                        Highly Rated
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {tvShows.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            marginTop: '30px',
                            marginBottom: '20px',
                            color: '#ffffff',
                            borderBottom: '2px solid #e50914',
                            paddingBottom: '10px',
                        }}
                    >
                        📺 Trending TV Shows
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        {tvShows.slice(0, 5).map((show) => (
                            <div
                                key={show.id}
                                style={{
                                    backgroundColor: '#141414',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    border: '1px solid #313131',
                                    marginBottom: '15px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '8px',
                                    }}
                                >
                                    {getTitle(show)}
                                </div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: '#b3b3b3',
                                        marginBottom: '10px',
                                    }}
                                >
                                    {getYear(show)} •{' '}
                                    {show.vote_average
                                        ? `⭐ ${show.vote_average.toFixed(1)}/10`
                                        : ''}
                                </div>
                                {show.overview && (
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: '#e5e5e5',
                                            lineHeight: '1.5',
                                        }}
                                    >
                                        {show.overview.length > 150
                                            ? `${show.overview.substring(0, 150)}...`
                                            : show.overview}
                                    </div>
                                )}
                                {show.vote_average && show.vote_average >= 7.5 && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            backgroundColor: '#e50914',
                                            color: '#ffffff',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            marginTop: '10px',
                                        }}
                                    >
                                        Highly Rated
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div
                className="divider"
                style={{ margin: '30px 0', height: '1px', backgroundColor: '#313131' }}
            ></div>

            <p style={{ fontSize: '13px', color: '#808080' }}>
                This is a test email to showcase email functionality. In production, you'll receive
                personalized recommendations and notifications based on your preferences.
            </p>
        </BaseEmail>
    )
}
