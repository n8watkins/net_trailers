import { expect, test } from '@playwright/test'

import { stubExternalMedia } from './stub-media'

/**
 * Once the home page has loaded it must go quiet. A row that handed the title
 * de-duplication a fresh list on every render once made React re-render the
 * whole page about 60 times a second, forever; the windows that load on demand
 * (title window, tour) then never got their turn and sat unopened.
 *
 * React reports every commit to a DevTools hook if one is installed before it
 * loads, so the commits can be counted without touching the app.
 */
test('the home page stops re-rendering once it has loaded', async ({ page }) => {
    await stubExternalMedia(page)
    await page.addInitScript(() => {
        const counter = { commits: 0 }
        const ignore = () => undefined
        ;(window as unknown as { __commitCounter: typeof counter }).__commitCounter = counter
        ;(window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
            supportsFiber: true,
            renderers: new Map(),
            inject: () => 1,
            checkDCE: ignore,
            onCommitFiberUnmount: ignore,
            onPostCommitFiberRoot: ignore,
            onCommitFiberRoot: () => {
                counter.commits++
            },
        }
    })

    await page.goto('/')
    await expect(page.locator('[data-tour="content-card"]').first()).toBeVisible()

    // Commits in a half-second window: a loaded page has none, the loop had about thirty.
    const commitsInHalfSecond = () =>
        page.evaluate(
            () =>
                new Promise<number>((resolve) => {
                    const counter = (window as unknown as { __commitCounter: { commits: number } })
                        .__commitCounter
                    const before = counter.commits
                    setTimeout(() => resolve(counter.commits - before), 500)
                })
        )
    await expect.poll(commitsInHalfSecond, { timeout: 15_000 }).toBeLessThanOrEqual(2)
})
