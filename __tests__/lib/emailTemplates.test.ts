/**
 * @jest-environment node
 *
 * The shared email layout and the six templates: escaping, footer links, no
 * em dashes, a text version, and the subject builders.
 */

import { digestSubject, nameList, oneLine, trendingSubject } from '@/lib/email/subjects'
import {
    announcementEmail,
    customEmail,
    replyEmail,
    signInEmail,
    socialDigestEmail,
    trendingEmail,
} from '@/lib/email/templates'
import { unsubscribeUrl } from '@/lib/email/brand'
import type { Content } from '../../typings'

const EM_DASH = '—'
const token = 'tok/a&b=c'

const movie = (id: number, title: string) =>
    ({
        id,
        title,
        media_type: 'movie',
        poster_path: '/p.jpg',
        overview: 'A long enough overview. '.repeat(10),
        release_date: '2026-03-01',
        vote_average: 7.4,
    }) as unknown as Content
const show = (id: number, name: string) =>
    ({
        id,
        name,
        media_type: 'tv',
        poster_path: '/q.jpg',
        overview: 'Overview',
        first_air_date: '2025-05-01',
        vote_average: 8.1,
    }) as unknown as Content

const interactions = [
    {
        type: 'comment' as const,
        rankingId: 'r1',
        rankingTitle: 'Top <10>',
        commenterName: 'Jordan',
        commentText: 'Nice <b>list</b>',
    },
    {
        type: 'comment' as const,
        rankingId: 'r1',
        rankingTitle: 'Top <10>',
        commenterName: 'Sam',
        commentText: 'Agreed',
        isReply: true,
    },
    {
        type: 'like' as const,
        rankingId: 'r2',
        rankingTitle: 'Shows',
        likerNames: ['Alex', 'Priya'],
    },
]

async function all() {
    return {
        'sign-in': await signInEmail(
            'https://nettrailers.n8builds.dev/api/auth/callback/email?token=t&email=a%40b.c'
        ),
        reply: await replyEmail({
            recipientName: 'Maya',
            replierName: 'Jordan',
            threadTitle: 'Best thrillers?',
            replyContent: 'Try Slow Horses',
            threadUrl: 'https://nettrailers.n8builds.dev/community/thread/t1',
            unsubscribeToken: token,
            isReplyToReply: false,
        }),
        digest: await socialDigestEmail({
            userName: 'Maya',
            interactions,
            unsubscribeToken: token,
        }),
        trending: await trendingEmail({
            userName: 'Maya',
            movies: [movie(1, 'Alpha'), movie(2, 'Beta')],
            tvShows: [show(3, 'Gamma')],
            unsubscribeToken: token,
        }),
        announcement: await announcementEmail({
            userName: 'Maya',
            subject: 'Maintenance',
            message: 'Offline Saturday.\nBack soon.',
            unsubscribeToken: token,
        }),
        custom: await customEmail({
            userName: 'Maya',
            subject: 'Forums',
            htmlContent: '<p>Hello</p><h2>New</h2><ul><li>Polls</li></ul>',
            unsubscribeToken: token,
        }),
    }
}

describe('email templates', () => {
    it('every email has HTML, a text version and the portfolio footer', async () => {
        for (const email of Object.values(await all())) {
            expect(email.html.length).toBeGreaterThan(500)
            expect(email.text.length).toBeGreaterThan(40)
            expect(email.html).toContain('href="https://n8builds.dev"')
            expect(email.html).toContain(
                'href="https://portfolio.n8builds.dev/projects/net-trailer"'
            )
            expect(email.html).toContain('/email/nettrailers-mark-96.png')
            expect(email.text).toContain('portfolio project by n8builds.dev')
            expect(`${email.subject}${email.html}${email.text}`).not.toContain(EM_DASH)
        }
    })

    it('uses the dark site palette by default, with the light variant behind a media query', async () => {
        const { html } = (await all()).digest
        expect(html).toContain('bgcolor="#0a0a0a"')
        expect(html).toContain('#fcd34d')
        expect(html).toContain('@media (prefers-color-scheme:light)')
        expect(html).not.toMatch(/text-transform:\s*uppercase/)
    })

    it('puts the unsubscribe and preferences links on every email except sign-in', async () => {
        const link = unsubscribeUrl(token)
        expect(link).toContain('/unsubscribe?token=tok%2Fa%26b%3Dc')
        for (const [name, email] of Object.entries(await all())) {
            if (name === 'sign-in') {
                expect(email.html).not.toContain('Unsubscribe')
                expect(email.html).not.toContain('Email preferences')
                expect(email.text).not.toContain('Unsubscribe')
                expect('unsubscribeUrl' in email).toBe(false)
            } else {
                expect(email.html).toContain('Unsubscribe')
                expect(email.html).toContain('Email preferences')
                expect(email.html).toContain(link.replace(/&/g, '&amp;'))
                expect(email.text).toContain(`Unsubscribe: ${link}`)
                expect((email as { unsubscribeUrl: string }).unsubscribeUrl).toBe(link)
            }
        }
    })

    it('escapes user-written values', async () => {
        const { digest } = await all()
        expect(digest.html).toContain('Top &lt;10&gt;')
        expect(digest.html).toContain('Nice &lt;b&gt;list&lt;/b&gt;')
        expect(digest.html).not.toContain('<b>list</b>')
        const evil = await announcementEmail({
            userName: '<i>x</i>',
            subject: '<script>1</script>',
            message: '<img src=x onerror=1>',
        })
        expect(evil.html).not.toContain('<script>1')
        expect(evil.html).not.toContain('<img src=x')
        expect(evil.html).toContain('&lt;script&gt;1&lt;/script&gt;')
    })

    it('signs announcements off as the NetTrailers team; no token means no unsubscribe link', async () => {
        const { announcement } = await all()
        expect(announcement.html).toContain('The NetTrailers team')
        expect(announcement.text).toContain('The NetTrailers team')
        const bare = await announcementEmail({ userName: 'M', subject: 'S', message: 'm' })
        expect(bare.unsubscribeUrl).toBeNull()
    })
})

describe('subject builders', () => {
    it('digestSubject names the people and the ranking', () => {
        expect(digestSubject(interactions)).toBe(
            'Jordan and Sam commented on "Top <10>", plus 2 likes'
        )
        expect(digestSubject([interactions[2]])).toBe('Alex and Priya liked "Shows"')
        expect(digestSubject([interactions[0], interactions[2]])).toBe(
            'Jordan commented on "Top <10>", plus 2 likes'
        )
    })

    it('trendingSubject names the top movie and show and counts the rest', () => {
        expect(trendingSubject([{ title: 'A' }, { title: 'B' }], [{ name: 'C' }])).toBe(
            'Trending this week: A, C and 1 more'
        )
        expect(trendingSubject([{ title: 'A' }], [{ name: 'C' }])).toBe(
            'Trending this week: A and C'
        )
        expect(trendingSubject([], [])).toBe('Trending this week on NetTrailers')
        expect(trendingSubject([{ title: 'A' }, { title: 'B' }], [])).toBe(
            'Trending this week: A and B'
        )
        expect(trendingSubject([{ title: 'A' }], [{ name: 'B' }])).not.toMatch(/Demo/)
    })

    it('helpers', () => {
        expect(nameList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B and 3 others')
        expect(oneLine('a  b\nc', 10)).toBe('a b c')
        expect(oneLine('one two three four', 9)).toBe('one two...')
    })
})
