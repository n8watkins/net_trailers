/**
 * @jest-environment node
 *
 * The email gate against the in-memory libSQL database (jest.setup.js), with
 * the provider mocked.
 */

const send = jest.fn(async (_message: Record<string, unknown>) => ({ messageId: 'msg-1' }))
jest.mock('../../lib/email/cloudflare', () => ({
    EMAIL_FROM: 'nettrailers@n8builds.dev',
    emailBinding: () => ({ send: (message: Record<string, unknown>) => send(message) }),
}))

process.env.EMAIL_DAILY_CAP = '3'
process.env.EMAIL_MONTHLY_CAP = '4'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const gate = require('../../lib/email/gate') as typeof import('../../lib/email/gate')

const day1 = new Date('2026-11-10T09:00:00Z')
const day2 = new Date('2026-11-11T09:00:00Z')

describe('email gate', () => {
    beforeEach(() => send.mockClear())

    it('applies the caller rules before the site caps', async () => {
        const perUser = [{ key: 'email:test:user-1', limit: 1, window: 'day' as const }]
        expect(await gate.reserveEmail('forum-reply', perUser, day1)).toEqual({ allowed: true })
        const refused = await gate.reserveEmail('forum-reply', perUser, day1)
        expect(refused).toMatchObject({ allowed: false, siteCap: false })
    })

    it('stops every kind at the daily cap and logs it', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        expect((await gate.reserveEmail('sign-in', [], day1)).allowed).toBe(true)
        expect((await gate.reserveEmail('trending', [], day1)).allowed).toBe(true)
        const refused = await gate.reserveEmail('sign-in', [], day1)
        expect(refused).toMatchObject({ allowed: false, siteCap: true })
        expect(error).toHaveBeenCalledWith(expect.stringContaining('daily limit 3'))
        error.mockRestore()
    })

    it('stops at the monthly cap on a later day', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        expect((await gate.reserveEmail('sign-in', [], day2)).allowed).toBe(true)
        const refused = await gate.reserveEmail('sign-in', [], day2)
        expect(refused).toMatchObject({ allowed: false, siteCap: true })
        expect(error).toHaveBeenCalledWith(expect.stringContaining('monthly limit 4'))
        error.mockRestore()
    })

    it('reports usage per kind without addresses', async () => {
        const usage = await gate.getEmailUsage(day1)
        expect(usage).toMatchObject({ today: 3, thisMonth: 4, dailyCap: 3, monthlyCap: 4 })
        expect(usage.byKind['sign-in']).toEqual({ sent: 1, refused: 1 })
        expect(usage.byKind['forum-reply']).toEqual({ sent: 1, refused: 1 })
        expect(usage.byKind.trending).toEqual({ sent: 1, refused: 0 })
    })

    it('sendEmail throws EmailLimitError and does not call the provider when refused', async () => {
        const none = [{ key: 'email:test:none', limit: 0, window: 'day' as const }]
        await expect(
            gate.sendEmail(
                'announcement',
                { to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' },
                none
            )
        ).rejects.toBeInstanceOf(gate.EmailLimitError)
        expect(send).not.toHaveBeenCalled()
    })

    it('sends through the Cloudflare binding from the app address, as HTML and text', async () => {
        // A later month, so the caps used up above don't apply (only Date is faked)
        jest.useFakeTimers({
            now: new Date('2026-12-15T09:00:00Z'),
            doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'],
        })
        const result = await gate.sendEmail('announcement', {
            to: 'a@example.com',
            subject: 'Hi',
            html: '<p>Hello <b>there</b></p>',
        })
        jest.useRealTimers()
        expect(result).toEqual({ id: 'msg-1' })
        expect(send).toHaveBeenCalledWith({
            to: 'a@example.com',
            from: { email: 'nettrailers@n8builds.dev', name: 'NetTrailers' },
            subject: 'Hi',
            html: '<p>Hello <b>there</b></p>',
            text: expect.stringContaining('Hello there'),
        })
        expect((send.mock.calls[0][0] as { headers?: unknown }).headers).toBeUndefined()
    })

    it('sets the one-click unsubscribe headers when it has an unsubscribe link, and a plain sender name', async () => {
        jest.useFakeTimers({
            now: new Date('2027-01-15T09:00:00Z'),
            doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'],
        })
        await gate.sendEmail('trending', {
            to: 'a@example.com',
            subject: 'Hi',
            html: '<p>Hi</p>',
            text: 'Hi (text)',
            unsubscribeUrl: 'https://nettrailers.n8builds.dev/unsubscribe?token=a%26b',
        })
        jest.useRealTimers()
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                from: { email: 'nettrailers@n8builds.dev', name: 'NetTrailers' },
                text: 'Hi (text)',
                headers: {
                    'List-Unsubscribe':
                        '<https://nettrailers.n8builds.dev/api/email/unsubscribe?token=a%26b>',
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            })
        )
    })

    it('delivers a reserved sign-in link without spending another unit', async () => {
        const before = await gate.getEmailUsage()
        await gate.deliverSignInLink(
            'b@example.com',
            'https://x.test/api/auth/callback/email?token=a&b=<c>'
        )
        const message = send.mock.calls[0][0] as { subject: string; html: string; text: string }
        expect(message.subject).toBe('Your NetTrailers sign-in link')
        expect(message.html).toContain('token=a&amp;b=&lt;c&gt;')
        expect(message.text).toContain('https://x.test/api/auth/callback/email?token=a&b=<c>')
        expect(message).not.toHaveProperty('headers')
        expect(message.html).not.toContain('Unsubscribe')
        expect((await gate.getEmailUsage()).today).toBe(before.today)
    })
})
