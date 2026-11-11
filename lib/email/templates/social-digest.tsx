/** The weekly social digest: comments and likes on the person's rankings. */

import * as React from 'react'

import { siteUrl, unsubscribeUrl as unsubscribeLink, SANS } from '../brand'
import {
    Button,
    EmailLayout,
    Heading,
    Panel,
    Paragraph,
    Quote,
    TextLink,
    emailText,
    renderEmail,
} from '../layout'
import { type DigestInteraction, digestSubject, nameList, plural } from '../subjects'

export interface SocialDigestProps {
    userName: string
    interactions: DigestInteraction[]
    unsubscribeToken?: string
}

const REASON =
    "You're getting this weekly summary because email notifications are on for your NetTrailers account."

interface Group {
    id: string
    title: string
    comments: DigestInteraction[]
    likers: string[]
}

function group(interactions: DigestInteraction[]): Group[] {
    const groups = new Map<string, Group>()
    for (const i of interactions) {
        const g = groups.get(i.rankingId) ?? {
            id: i.rankingId,
            title: i.rankingTitle,
            comments: [],
            likers: [],
        }
        if (i.type === 'comment') g.comments.push(i)
        else g.likers.push(...(i.likerNames ?? []))
        groups.set(i.rankingId, g)
    }
    return [...groups.values()]
}

export async function socialDigestEmail({
    userName,
    interactions,
    unsubscribeToken,
}: SocialDigestProps) {
    const site = siteUrl()
    const unsubscribeUrl = unsubscribeToken ? unsubscribeLink(unsubscribeToken) : null
    const groups = group(interactions)
    const commentCount = groups.reduce((n, g) => n + g.comments.length, 0)
    const likeCount = groups.reduce((n, g) => n + g.likers.length, 0)
    const summary = [
        commentCount && plural(commentCount, 'comment'),
        likeCount && plural(likeCount, 'like'),
    ]
        .filter(Boolean)
        .join(' and ')
    const subject = digestSubject(interactions)
    const allUrl = `${site}/community?filter=my-rankings`
    const element = (
        <EmailLayout
            title={subject}
            preheader={`${summary || 'New activity'} on ${plural(groups.length, 'ranking')} this week.`}
            reason={REASON}
            unsubscribeUrl={unsubscribeUrl}
        >
            <Heading>New activity on your rankings</Heading>
            <Paragraph>
                Hi {userName}, your rankings got {summary || 'new activity'} this week.
            </Paragraph>
            {groups.map((g) => (
                <Panel key={g.id}>
                    <p style={{ margin: '0 0 12px', font: `700 17px/24px ${SANS}` }}>
                        <TextLink href={`${site}/rankings/${encodeURIComponent(g.id)}`}>
                            {g.title}
                        </TextLink>
                    </p>
                    {g.comments.map((c, i) => (
                        <React.Fragment key={c.commentId ?? i}>
                            <p
                                className="nt-ink"
                                style={{
                                    margin: 0,
                                    font: `700 14px/20px ${SANS}`,
                                    color: '#ffffff',
                                }}
                            >
                                {c.commenterName}
                                <span
                                    className="nt-subtle"
                                    style={{ fontWeight: 400, color: '#a1a1aa' }}
                                >
                                    {c.isReply ? ' replied to your comment' : ' commented'}
                                </span>
                            </p>
                            <Quote>{c.commentText}</Quote>
                        </React.Fragment>
                    ))}
                    {g.likers.length > 0 && (
                        <Paragraph
                            style={{ fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }}
                        >
                            <span className="nt-ink" style={{ color: '#ffffff', fontWeight: 700 }}>
                                {nameList(g.likers)}
                            </span>{' '}
                            liked this ranking.
                        </Paragraph>
                    )}
                </Panel>
            ))}
            <Button href={allUrl}>See your rankings</Button>
        </EmailLayout>
    )
    const text = emailText({
        lines: [
            'New activity on your rankings',
            '',
            `Hi ${userName}, your rankings got ${summary || 'new activity'} this week.`,
            ...groups.flatMap((g) => [
                '',
                `${g.title}: ${site}/rankings/${encodeURIComponent(g.id)}`,
                ...g.comments.map(
                    (c) =>
                        `- ${c.commenterName}${c.isReply ? ' replied to your comment' : ''}: "${c.commentText}"`
                ),
                ...(g.likers.length ? [`- ${nameList(g.likers)} liked it`] : []),
            ]),
            '',
            `See your rankings: ${allUrl}`,
        ],
        reason: REASON,
        unsubscribeUrl,
    })
    return { subject, unsubscribeUrl, ...(await renderEmail(element, text)) }
}
