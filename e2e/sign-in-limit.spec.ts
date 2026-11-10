import { expect, test } from '@playwright/test'

/**
 * Anyone can ask for a sign-in link to any address, so the number of links per
 * address is limited (lib/email/signInLimits.ts, 5 a day by default). Past the
 * limit the form says so instead of sending another email.
 */

const email = `limit-${Date.now()}@nettrailers.test`

test('stops sending sign-in links to one address after the daily limit', async ({
    page,
    baseURL,
}) => {
    // Five links through Auth.js's own endpoint, as a script would ask for them
    for (let i = 0; i < 5; i++) {
        const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json()
        const response = await page.request.post('/api/auth/signin/email', {
            headers: { Origin: baseURL!, 'X-Auth-Return-Redirect': '1' },
            // Cloudflare's dummy token, which the e2e server's test secret accepts
            form: {
                email,
                csrfToken,
                callbackUrl: baseURL!,
                'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX',
            },
        })
        const { url } = await response.json()
        expect(url).toContain('verify-request')
    }

    // The sixth, through the sign-in form, is refused with a clear message
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByRole('button', { name: /Email me a sign-in link/i }).click()
    await expect(page.getByText(/Too many sign-in emails for now/)).toBeVisible()
    await expect(page.getByText('Check your inbox')).toHaveCount(0)
})

test('refuses a request for a sign-in link without a Turnstile token', async ({
    page,
    baseURL,
}) => {
    const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json()
    const response = await page.request.post('/api/auth/signin/email', {
        headers: { Origin: baseURL!, 'X-Auth-Return-Redirect': '1' },
        form: { email: `bot-${Date.now()}@nettrailers.test`, csrfToken, callbackUrl: baseURL! },
    })
    const { url } = await response.json()
    expect(new URL(url).searchParams.get('error')).toBe('Turnstile')
})
