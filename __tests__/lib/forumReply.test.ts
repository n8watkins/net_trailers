/**
 * @jest-environment node
 *
 * Forum reply emails against a throwaway libSQL file database, with the email
 * provider mocked: built from the stored reply, only for real replies, only to
 * opted-in recipients, escaped, and limited per sender and per recipient.
 */

import { readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import { sql } from 'drizzle-orm'

const send = jest.fn(async (_message: Record<string, unknown>) => ({ messageId: 'msg' }))
// Imports are hoisted above `send`, so the mock reads it lazily.
jest.mock('../../lib/email/cloudflare', () => ({
    EMAIL_FROM: 'net-trailers@n8builds.dev',
    emailBinding: () => ({ send: (message: Record<string, unknown>) => send(message) }),
}))

// createReply runs in a transaction, and libSQL gives a transaction its own
// connection: with `:memory:` that is a separate, empty database. A file works.
// The client is created on first query, after this line runs.
const dbFile = path.join(tmpdir(), `nettrailers-forum-${process.pid}-${Date.now()}.db`)
process.env.TURSO_DATABASE_URL = `file:${dbFile}`
afterAll(() => rmSync(dbFile, { force: true }))

process.env.EMAIL_FORUM_PER_SENDER_DAILY = '2'
process.env.EMAIL_FORUM_PER_RECIPIENT_DAILY = '3'

import { db } from '@/db'
import { profiles, users } from '@/db/schema'
import { createReply, createThread } from '@/db/queries/threads'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { notifyReply } from '@/lib/email/forumReply'
import { replyEmail } from '@/lib/email/templates'

const origin = 'https://nettrailers.example'

async function optIn(userId: string) {
    const prefs = await loadUserPreferences(userId)
    await saveUserPreferences(userId, {
        ...prefs,
        notifications: { ...(prefs.notifications as object), email: true } as never,
    })
}

let threadId = ''

beforeAll(async () => {
    const migDir = path.join(process.cwd(), 'db/migrations')
    for (const file of readdirSync(migDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()) {
        const statements = readFileSync(path.join(migDir, file), 'utf-8')
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter(Boolean)
        for (const stmt of statements) await db.run(sql.raw(stmt))
    }
    await db.insert(users).values([
        { id: 'owner', email: 'owner@example.com', name: 'Owner' },
        { id: 'replier', email: 'replier@example.com', name: 'GitHub Name' },
        { id: 'quiet', email: 'quiet@example.com', name: 'Quiet' },
    ])
    await db.insert(profiles).values({
        userId: 'replier',
        displayName: 'Replier <b>',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    })
    await optIn('owner')
    const thread = await createThread({
        title: 'Best <script>alert(1)</script> of 2026',
        content: 'Discuss',
        category: 'movies',
        userId: 'owner',
        userName: 'Owner',
        userAvatar: null,
    })
    threadId = thread.id
})

beforeEach(() => send.mockClear())

async function reply(userId: string, content: string, parentReplyId?: string) {
    return createReply({
        threadId,
        userId,
        userName: null,
        userAvatar: null,
        content,
        parentReplyId,
    })
}

describe('forum reply email', () => {
    it('emails the thread author, built from the stored reply and escaped', async () => {
        const stored = await reply('replier', 'Great <img src=x onerror=alert(1)> pick')
        expect(await notifyReply(stored.id, 'replier', origin)).toEqual({ sent: true })
        expect(send).toHaveBeenCalledTimes(1)
        const message = send.mock.calls[0][0] as {
            to: string
            subject: string
            html: string
            text: string
            from: { name: string }
            headers: Record<string, string>
        }
        expect(message.to).toBe('owner@example.com')
        expect(message.subject).toBe(
            'Replier <b> replied to your thread "Best <script>alert(1)</script> of 2026"'
        )
        expect(message.html).toContain('Great &lt;img src=x onerror=alert(1)&gt; pick')
        expect(message.html).toContain('Replier &lt;b&gt;')
        expect(message.html).not.toContain('<script>')
        expect(message.html).toContain(`${origin}/community/thread/${threadId}`)
        expect(message.html).toContain('/unsubscribe?token=')
        expect(message.text).toContain('Read the reply:')
        expect(message.text).toContain('/unsubscribe?token=')
        expect(message.from.name).toBe('NetTrailers')
        expect(message.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    })

    it('sends nothing for a reply that is not the caller’s', async () => {
        const stored = await reply('replier', 'Mine')
        expect(await notifyReply(stored.id, 'quiet', origin)).toEqual({
            sent: false,
            reason: 'not-author',
        })
        expect(await notifyReply('no-such-reply', 'replier', origin)).toEqual({
            sent: false,
            reason: 'no-reply',
        })
        expect(send).not.toHaveBeenCalled()
    })

    it('sends nothing to recipients who have not turned email on, or to oneself', async () => {
        const quietReply = await reply('quiet', 'I never opted in')
        const answer = await reply('replier', 'Answering quiet', quietReply.id)
        expect(await notifyReply(answer.id, 'replier', origin)).toEqual({
            sent: false,
            reason: 'opted-out',
        })
        const own = await reply('owner', 'Replying in my own thread')
        expect(await notifyReply(own.id, 'owner', origin)).toEqual({ sent: false, reason: 'self' })
        expect(send).not.toHaveBeenCalled()
    })

    it('limits emails per sender per day', async () => {
        // The first test spent one of the sender's two.
        const second = await reply('replier', 'Second')
        expect(await notifyReply(second.id, 'replier', origin)).toEqual({ sent: true })
        const third = await reply('replier', 'Third')
        expect(await notifyReply(third.id, 'replier', origin)).toEqual({
            sent: false,
            reason: 'limited',
        })
        expect(send).toHaveBeenCalledTimes(1)
    })

    it('limits emails per recipient per day, whoever sends them', async () => {
        // The owner has had two today; the per-recipient limit is three.
        const fromQuiet = await reply('quiet', 'One more')
        expect(await notifyReply(fromQuiet.id, 'quiet', origin)).toEqual({ sent: true })
        const another = await reply('quiet', 'And another')
        expect(await notifyReply(another.id, 'quiet', origin)).toEqual({
            sent: false,
            reason: 'limited',
        })
    })

    it('escapes every value in the HTML', async () => {
        const { html, subject } = await replyEmail({
            recipientName: '"><a>',
            replierName: '<x>',
            threadTitle: '&',
            replyContent: "it's",
            threadUrl: 'https://a.example/?q="x"',
            unsubscribeToken: null,
            isReplyToReply: true,
        })
        expect(html).toContain('&quot;&gt;&lt;a&gt;')
        expect(html).toContain('&lt;x&gt;')
        expect(html).toContain('it&#x27;s')
        expect(html).toContain('https://a.example/?q=&quot;x&quot;')
        expect(html).toContain('replied to your comment')
        expect(html).not.toContain('<a>')
        expect(subject).toBe('<x> replied to your comment on "&"')
    })
})
