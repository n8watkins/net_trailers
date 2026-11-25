/**
 * @jest-environment node
 *
 * GET /api/youtube/iframe-api relays YouTube's player API loader without
 * passing on the cookies YouTube's response sets.
 */
import { GET } from '../../../app/api/youtube/iframe-api/route'

const LOADER = "var scriptUrl = 'https:\\/\\/www.youtube.com\\/s\\/player\\/x\\/www-widgetapi.js';"

describe('GET /api/youtube/iframe-api', () => {
    const realFetch = global.fetch
    afterEach(() => {
        global.fetch = realFetch
        jest.restoreAllMocks()
    })

    it('returns the loader as JavaScript, without YouTube’s cookies', async () => {
        global.fetch = jest.fn().mockResolvedValue(
            new Response(LOADER, {
                headers: {
                    'Content-Type': 'text/javascript; charset=utf-8',
                    'Set-Cookie': 'YSC=abc; Domain=.youtube.com; Path=/; Secure',
                },
            })
        )
        const res = await GET()
        expect(global.fetch).toHaveBeenCalledWith(
            'https://www.youtube.com/iframe_api',
            expect.anything()
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('text/javascript')
        expect(res.headers.get('set-cookie')).toBeNull()
        expect(res.headers.get('cache-control')).toContain('max-age=3600')
        expect(await res.text()).toBe(LOADER)
    })

    it('answers 502 when YouTube does not send a script', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        global.fetch = jest.fn().mockResolvedValue(
            new Response('<html>Oops</html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html' },
            })
        )
        const res = await GET()
        expect(res.status).toBe(502)
        expect(res.headers.get('cache-control')).toBe('no-store')
    })

    it('answers 502 when YouTube cannot be reached', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        global.fetch = jest.fn().mockRejectedValue(new TypeError('network'))
        const res = await GET()
        expect(res.status).toBe(502)
    })
})
