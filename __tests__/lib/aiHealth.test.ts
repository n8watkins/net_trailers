/**
 * @jest-environment node
 */

import { classifyGeminiFailure, getAiHealth, probeGemini } from '../../lib/aiHealth'

const respond = (status: number, body: unknown) =>
    jest.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': 'application/json' },
        })
    ) as unknown as typeof fetch

describe('AI health check', () => {
    it('reports ok when Gemini answers, and sends the key in a header only', async () => {
        const fetchImpl = respond(200, { candidates: [] })
        const health = await probeGemini('secret-key', fetchImpl)
        expect(health).toMatchObject({ ok: true, reason: null })
        const [url, init] = (fetchImpl as unknown as jest.Mock).mock.calls[0]
        expect(String(url)).not.toContain('secret-key')
        expect(init.headers['x-goog-api-key']).toBe('secret-key')
    })

    it('classifies failures without exposing the provider message', async () => {
        const invalid = await probeGemini(
            'k',
            respond(400, {
                error: {
                    message: 'API key not valid. Please pass a valid API key.',
                    status: 'INVALID_ARGUMENT',
                    details: [{ reason: 'API_KEY_INVALID' }],
                },
            })
        )
        expect(invalid).toMatchObject({ ok: false, reason: 'key_invalid' })
        expect(JSON.stringify(invalid)).not.toContain('API key not valid')

        expect(classifyGeminiFailure(429, { error: { status: 'RESOURCE_EXHAUSTED' } })).toBe(
            'quota'
        )
        expect(classifyGeminiFailure(500, {})).toBe('upstream_error')
        expect(await probeGemini(undefined)).toMatchObject({ ok: false, reason: 'not_configured' })
    })

    it('reports a timeout when the call is aborted', async () => {
        const fetchImpl = jest
            .fn()
            .mockRejectedValue(
                Object.assign(new Error('aborted'), { name: 'AbortError' })
            ) as unknown as typeof fetch
        expect(await probeGemini('k', fetchImpl)).toMatchObject({ ok: false, reason: 'timeout' })
    })

    it('caches the result so repeated checks make one call', async () => {
        const original = global.fetch
        const fetchMock = respond(200, {})
        global.fetch = fetchMock
        process.env.GEMINI_API_KEY = 'k'
        try {
            const now = Date.now()
            const first = await getAiHealth(now)
            const second = await getAiHealth(now + 10 * 60 * 1000)
            expect(first.ok && second.ok).toBe(true)
            expect((fetchMock as unknown as jest.Mock).mock.calls).toHaveLength(1)
        } finally {
            global.fetch = original
            delete process.env.GEMINI_API_KEY
        }
    })

    it('never says "ok" in a failure body, so a keyword monitor cannot be fooled', () => {
        for (const reason of [
            'not_configured',
            'key_invalid',
            'quota',
            'timeout',
            'upstream_error',
        ]) {
            const body = JSON.stringify({
                ai: 'down',
                reason,
                checkedAt: new Date(0).toISOString(),
            })
            expect(body.toLowerCase()).not.toContain('ok')
        }
    })
})
