import * as React from 'react'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface TrendingContentEmailProps {
    userName: string
    movies: Content[]
    tvShows: Content[]
}

export const TrendingContentEmail = ({ userName, movies, tvShows }: TrendingContentEmailProps) => {
    return (
        <html>
            <head>
                <style>{`
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background-color: #000000;
                        color: #ffffff;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #e50914;
                        margin-bottom: 10px;
                    }
                    .subtitle {
                        font-size: 16px;
                        color: #b3b3b3;
                    }
                    .greeting {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 20px;
                    }
                    .intro {
                        font-size: 16px;
                        color: #b3b3b3;
                        margin-bottom: 40px;
                        line-height: 1.5;
                    }
                    .section-title {
                        font-size: 20px;
                        font-weight: 600;
                        margin: 30px 0 20px 0;
                        color: #ffffff;
                        border-bottom: 2px solid #e50914;
                        padding-bottom: 10px;
                    }
                    .content-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .content-item {
                        background-color: #141414;
                        border-radius: 8px;
                        padding: 20px;
                        border: 1px solid #313131;
                    }
                    .content-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #ffffff;
                        margin-bottom: 8px;
                    }
                    .content-meta {
                        font-size: 14px;
                        color: #b3b3b3;
                        margin-bottom: 10px;
                    }
                    .content-overview {
                        font-size: 14px;
                        color: #e5e5e5;
                        line-height: 1.5;
                    }
                    .rating {
                        display: inline-block;
                        background-color: #e50914;
                        color: #ffffff;
                        padding: 4px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-top: 10px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #313131;
                        color: #b3b3b3;
                        font-size: 14px;
                    }
                    .cta-button {
                        display: inline-block;
                        background-color: #e50914;
                        color: #ffffff;
                        padding: 12px 24px;
                        border-radius: 4px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                `}</style>
            </head>
            <body>
                <div className="container">
                    <div className="header">
                        <div className="logo">NET TRAILERS</div>
                        <div className="subtitle">Your Weekly Trending Content</div>
                    </div>

                    <div className="greeting">Hello{userName ? `, ${userName}` : ''}! 👋</div>

                    <div className="intro">
                        This is a demo email showcasing the trending movies and TV shows this week.
                        This feature demonstrates our email notification system using Resend.
                    </div>

                    {movies.length > 0 && (
                        <>
                            <div className="section-title">🎬 Trending Movies</div>
                            <div className="content-grid">
                                {movies.slice(0, 5).map((movie) => (
                                    <div key={movie.id} className="content-item">
                                        <div className="content-title">{getTitle(movie)}</div>
                                        <div className="content-meta">
                                            {getYear(movie)} • {movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}/10` : ''}
                                        </div>
                                        {movie.overview && (
                                            <div className="content-overview">
                                                {movie.overview.length > 150
                                                    ? `${movie.overview.substring(0, 150)}...`
                                                    : movie.overview}
                                            </div>
                                        )}
                                        {movie.vote_average && movie.vote_average >= 7.5 && (
                                            <span className="rating">Highly Rated</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {tvShows.length > 0 && (
                        <>
                            <div className="section-title">📺 Trending TV Shows</div>
                            <div className="content-grid">
                                {tvShows.slice(0, 5).map((show) => (
                                    <div key={show.id} className="content-item">
                                        <div className="content-title">{getTitle(show)}</div>
                                        <div className="content-meta">
                                            {getYear(show)} • {show.vote_average ? `⭐ ${show.vote_average.toFixed(1)}/10` : ''}
                                        </div>
                                        {show.overview && (
                                            <div className="content-overview">
                                                {show.overview.length > 150
                                                    ? `${show.overview.substring(0, 150)}...`
                                                    : show.overview}
                                            </div>
                                        )}
                                        {show.vote_average && show.vote_average >= 7.5 && (
                                            <span className="rating">Highly Rated</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="footer">
                        <p>
                            This is a demonstration email sent from Net Trailers.
                            <br />
                            You can manage your notification preferences in your account settings.
                        </p>
                        <p style={{ marginTop: '20px', fontSize: '12px' }}>
                            © {new Date().getFullYear()} Net Trailers. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    )
}
