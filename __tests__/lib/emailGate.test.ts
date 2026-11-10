/**
 * @jest-environment node
 *
 * The email gate against the in-memory libSQL database (jest.setup.js), with
 * the provider mocked.
 */

const send = jest.fn(async () => ({ data: { id: 'msg-1' }, error: null }))
jest.mock('../../lib/email/resend', () => ({ resend: { emails: { send } } }))

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
})
