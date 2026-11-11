/** The weekly trending email: top movies and TV shows with their trailers. */

import * as React from 'react'

import { Content, getTitle, getYear } from '../../../typings'
import { SANS, siteUrl, unsubscribeUrl as unsubscribeLink } from '../brand'
import {
    Button,
    EmailLayout,
    Heading,
    Label,
    Paragraph,
    Rule,
    Small,
    TextLink,
    emailText,
    renderEmail,
} from '../layout'
import { oneLine, trendingSubject } from '../subjects'

export interface TrendingProps {
    userName: string
    movies: Content[]
    tvShows: Content[]
    unsubscribeToken?: string
}

const REASON =
    "You're getting this weekly email because trending updates and email notifications are on for your NetTrailers account."
const PER_LIST = 5

function itemUrl(site: string, content: Content, fallback: 'movie' | 'tv'): string {
    return `${site}/?modal=${content.media_type ?? fallback}&id=${content.id}`
}

function meta(content: Content, kind: string): string {
    const stars = content.vote_average ? `★ ${content.vote_average.toFixed(1)}` : null
    return [getYear(content), kind, stars].filter(Boolean).join(' · ')
}

export async function trendingEmail({
    userName,
    movies,
    tvShows,
    unsubscribeToken,
}: TrendingProps) {
    const site = siteUrl()
    const unsubscribeUrl = unsubscribeToken ? unsubscribeLink(unsubscribeToken) : null
    const topMovies = movies.slice(0, PER_LIST)
    const topShows = tvShows.slice(0, PER_LIST)
    const named = (c: Content) => ({ title: getTitle(c) })
    const subject = trendingSubject(topMovies.map(named), topShows.map(named))
    const lead = [topMovies[0], topShows[0]].filter(Boolean).map((c) => getTitle(c))

    const section = (name: string, list: Content[], kind: string, fallback: 'movie' | 'tv') =>
        list.length === 0 ? null : (
            <>
                <Rule />
                <Label>{name}</Label>
                {list.map((c) => {
                    const url = itemUrl(site, c, fallback)
                    const title = getTitle(c)
                    return (
                        <table
                            key={c.id}
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            border={0}
                            style={{ margin: '0 0 18px' }}
                        >
                            <tbody>
                                <tr>
                                    {c.poster_path && (
                                        <td
                                            className="nt-poster"
                                            width={80}
                                            valign="top"
                                            style={{ width: '80px', paddingRight: '14px' }}
                                        >
                                            <a href={url}>
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w185${c.poster_path}`}
                                                    width={80}
                                                    height={120}
                                                    alt={`${title} poster`}
                                                    style={{
                                                        display: 'block',
                                                        width: '80px',
                                                        height: '120px',
                                                        borderRadius: '6px',
                                                        objectFit: 'cover',
                                                        background: '#27272a',
                                                    }}
                                                />
                                            </a>
                                        </td>
                                    )}
                                    <td valign="top">
                                        <p
                                            style={{
                                                margin: '0 0 2px',
                                                font: `700 17px/23px ${SANS}`,
                                            }}
                                        >
                                            <TextLink href={url}>{title}</TextLink>
                                        </p>
                                        <Small style={{ margin: '0 0 6px' }}>{meta(c, kind)}</Small>
                                        {c.overview && (
                                            <Paragraph
                                                style={{
                                                    fontSize: '14px',
                                                    lineHeight: '21px',
                                                    margin: '0 0 6px',
                                                }}
                                            >
                                                {oneLine(c.overview, 140)}
                                            </Paragraph>
                                        )}
                                        <p style={{ margin: 0, font: `600 14px/20px ${SANS}` }}>
                                            <TextLink href={url}>Watch the trailer</TextLink>
                                        </p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )
                })}
            </>
        )

    const element = (
        <EmailLayout
            title={subject}
            preheader={
                lead.length
                    ? `${lead.join(', ')} and more of what people are watching trailers for this week.`
                    : 'What people are watching trailers for this week.'
            }
            reason={REASON}
            unsubscribeUrl={unsubscribeUrl}
        >
            <Heading>Trending this week</Heading>
            <Paragraph>
                Hi {userName}, here is what people are watching trailers for right now.
            </Paragraph>
            {section('Movies', topMovies, 'Movie', 'movie')}
            {section('TV shows', topShows, 'TV show', 'tv')}
            <Button href={site}>Explore NetTrailers</Button>
        </EmailLayout>
    )
    const textList = (list: Content[], fallback: 'movie' | 'tv') =>
        list.map((c) => `- ${getTitle(c)} (${getYear(c)}): ${itemUrl(site, c, fallback)}`)
    const text = emailText({
        lines: [
            'Trending this week',
            '',
            `Hi ${userName}, here is what people are watching trailers for right now.`,
            ...(topMovies.length ? ['', 'Movies', ...textList(topMovies, 'movie')] : []),
            ...(topShows.length ? ['', 'TV shows', ...textList(topShows, 'tv')] : []),
            '',
            `Explore NetTrailers: ${site}`,
        ],
        reason: REASON,
        unsubscribeUrl,
    })
    return { subject, unsubscribeUrl, ...(await renderEmail(element, text)) }
}
