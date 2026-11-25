import { expect, test } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Trailers set no YouTube cookies (audit K2). Nothing from YouTube loads until
 * a title is opened; then the player API comes from this site
 * (app/api/youtube/iframe-api, answered here with a stand-in) and the player
 * is created on www.youtube-nocookie.com. Real YouTube is never contacted.
 */

const FAKE_YT_API = `
window.YT = {
    loaded: 1,
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
    Player: function (el, options) {
        window.__ytPlayers = (window.__ytPlayers || []).concat({ host: options.host, videoId: options.videoId })
        return new Proxy({}, { get: function () { return function () { return 0 } } })
    },
};
if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
`

test('a trailer loads nothing from youtube.com and plays on the no-cookie host', async ({
    page,
}) => {
    const youtube: string[] = []
    page.on('request', (request) => {
        if (/youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com/.test(request.url())) {
            youtube.push(request.url())
        }
    })
    await stubExternalMedia(page)
    let relayed = 0
    await page.route('**/api/youtube/iframe-api', (route) => {
        relayed++
        return route.fulfill({ contentType: 'text/javascript', body: FAKE_YT_API })
    })

    // The recorded TMDB fixtures do not cover every hero title's details, so
    // the opened title gets a known trailer here.
    await page.route('**/api/movies/details/**', async (route) => {
        const response = await route.fetch()
        const data = response.ok() ? await response.json() : { id: 1, title: 'Fixture' }
        data.videos = {
            results: [{ key: 'qKGgw7Ob5f4', site: 'YouTube', type: 'Trailer', name: 'Trailer' }],
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(data),
        })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(youtube, 'nothing from YouTube before a title is opened').toEqual([])
    expect(relayed).toBe(0)

    // A click before hydration (or mid slide change) does nothing: retry until it opens.
    const title = page.locator('.MuiModal-root h3').first()
    await expect(async () => {
        await page
            .getByRole('button', { name: /More Info/i })
            .first()
            .click()
        await expect(title).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })

    await expect.poll(() => relayed).toBe(1)
    // The player itself is a lazily loaded chunk, so give it time on a busy machine.
    const players = () =>
        page.evaluate(
            () =>
                (window as unknown as { __ytPlayers?: { host: string; videoId: string }[] })
                    .__ytPlayers ?? []
        )
    await expect.poll(async () => (await players()).length, { timeout: 30_000 }).toBeGreaterThan(0)
    const [player] = await players()
    expect(player.host).toBe('https://www.youtube-nocookie.com')
    expect(player.videoId).toBe('qKGgw7Ob5f4')
    expect(
        youtube.filter((url) => url.startsWith('https://www.youtube.com/')),
        'no request to www.youtube.com (its iframe_api response sets tracking cookies)'
    ).toEqual([])
})
