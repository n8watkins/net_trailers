import { routeGeminiRequest, DEFAULT_MODEL_PRIORITY } from '@/lib/geminiRouter'

const config = { contents: [{ parts: [{ text: 'hi' }] }] }

function reply(status: number, body: unknown) {
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

describe('geminiRouter', () => {
    const fetchMock = jest.fn()
    beforeEach(() => {
        fetchMock.mockReset()
        global.fetch = fetchMock as unknown as typeof fetch
    })

    it('uses gemini-3.5-flash-lite first, with gemini-3.1-flash-lite as the backup', () => {
        expect(DEFAULT_MODEL_PRIORITY).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])
    })

    it('sends the key in a header, never in the URL', async () => {
        fetchMock.mockReturnValue(reply(200, { candidates: [] }))
        await routeGeminiRequest(config, 'test-key-123')
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).not.toContain('key=')
        expect(url).toContain('/models/gemini-3.5-flash-lite:generateContent')
        expect(init.headers['x-goog-api-key']).toBe('test-key-123')
    })

    it('falls back to the backup when the first model is overloaded', async () => {
        fetchMock
            .mockReturnValueOnce(reply(503, { error: { message: 'overloaded' } }))
            .mockReturnValueOnce(reply(200, { candidates: [] }))
        const result = await routeGeminiRequest(config, 'k')
        expect(result.success).toBe(true)
        expect(result.metadata?.chosenModel).toBe('gemini-3.1-flash-lite')
    })

    it('does not retry a rejected key on the backup', async () => {
        fetchMock.mockReturnValue(
            reply(400, { error: { message: 'API key not valid', status: 'INVALID_ARGUMENT' } })
        )
        const result = await routeGeminiRequest(config, 'bad')
        expect(result.success).toBe(false)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
