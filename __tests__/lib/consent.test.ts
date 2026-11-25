/**
 * @jest-environment node
 *
 * The analytics consent bootstrap (lib/consent.ts), ported with the code from
 * n8builds.dev (tests/unit/consent.test.ts in n8watkins/n8builds-web).
 */

import {
    CONSENT_COOKIE,
    CONSENT_COOKIE_DOMAIN,
    CONSENT_REGIONS,
    CONSENT_STORAGE_KEY,
    consentBootstrapScript,
    GA_GRACE_MS,
    GA_IDLE_TIMEOUT_MS,
    isConsentTimeZone,
    type ConsentApi,
} from '../../lib/consent'

/**
 * Runs the inline consent bootstrap against a fake browser: a cookie jar that
 * records every write, localStorage, a time zone, GPC, and a <head> that
 * records the scripts added to it.
 */
function boot({
    timeZone = 'America/Los_Angeles',
    cookie = '',
    stored = null as string | null,
    gpc = undefined as boolean | undefined,
    hostname = 'net-trailers.n8builds.dev',
    protocol = 'https:',
    // Timers fire at once unless held, so "GA loads" means it loads eventually.
    holdTimers = false,
} = {}) {
    const jar = new Map<string, string>()
    for (const part of cookie
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean)) {
        const [name, value] = part.split('=')
        jar.set(name, value)
    }
    const cookieWrites: string[] = []
    const scripts: string[] = []
    const storage = new Map<string, string>(stored ? [[CONSENT_STORAGE_KEY, stored]] : [])
    const document = {
        readyState: 'complete',
        get cookie() {
            return [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
        },
        set cookie(value: string) {
            cookieWrites.push(value)
            const [pair] = value.split(';')
            const [name, v] = pair.split('=')
            if (/Max-Age=0/.test(value)) jar.delete(name)
            else jar.set(name, v)
        },
        createElement: () => ({ async: false, src: '' }),
        head: { appendChild: (s: { src: string }) => scripts.push(s.src) },
    }
    const events: string[] = []
    const timers: { fn: () => void; ms: number }[] = []
    const listeners = new Map<string, () => void>()
    const idleTimeouts: (number | undefined)[] = []
    const window: Record<string, unknown> = {
        location: { hostname, protocol },
        navigator: gpc === undefined ? {} : { globalPrivacyControl: gpc },
        localStorage: {
            getItem: (k: string) => storage.get(k) ?? null,
            setItem: (k: string, v: string) => void storage.set(k, v),
        },
        requestIdleCallback: (f: () => void, options?: { timeout?: number }) => {
            idleTimeouts.push(options?.timeout)
            f()
        },
        setTimeout: (fn: () => void, ms: number) => (holdTimers ? timers.push({ fn, ms }) : fn()),
        addEventListener: (type: string, fn: () => void) => void listeners.set(type, fn),
        removeEventListener: (type: string, fn: () => void) => {
            if (listeners.get(type) === fn) listeners.delete(type)
        },
        dispatchEvent: (e: { type: string }) => events.push(e.type),
    }
    const Intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) }
    class CustomEvent {
        constructor(public type: string) {}
    }
    new Function('window', 'document', 'Intl', 'CustomEvent', consentBootstrapScript('G-TEST'))(
        window,
        document,
        Intl,
        CustomEvent
    )
    const dataLayer = window.dataLayer as IArguments[]
    return {
        consent: window.n8Consent as ConsentApi,
        get commands() {
            return dataLayer.map((args) => [...args])
        },
        scripts,
        cookieWrites,
        jar,
        storage,
        events,
        timers,
        listeners,
        idleTimeouts,
    }
}

const GTAG = 'https://www.googletagmanager.com/gtag/js?id=G-TEST'

describe('shared with n8builds.dev', () => {
    it('uses the same cookie, domain and fallback key as n8builds.dev', () => {
        expect(CONSENT_COOKIE).toBe('n8-consent')
        expect(CONSENT_COOKIE_DOMAIN).toBe('n8builds.dev')
        expect(CONSENT_STORAGE_KEY).toBe('n8-analytics-consent')
    })
})

describe('isConsentTimeZone', () => {
    it('asks European, Atlantic European and Quebec zones', () => {
        for (const tz of [
            'Europe/Berlin',
            'Europe/London',
            'Europe/Zurich',
            'Atlantic/Reykjavik',
            'Arctic/Longyearbyen',
            'America/Toronto',
            'America/Montreal',
            'America/Blanc-Sablon',
        ]) {
            expect(isConsentTimeZone(tz)).toBe(true)
        }
    })
    it("doesn't ask the rest", () => {
        for (const tz of [
            'America/Los_Angeles',
            'America/New_York',
            'America/Vancouver',
            'Asia/Tokyo',
            'UTC',
            '',
            undefined,
        ]) {
            expect(isConsentTimeZone(tz)).toBe(false)
        }
    })
})

describe('consent bootstrap', () => {
    it('sets region defaults (denied for EEA, UK, CH and Quebec) before anything else, ads denied everywhere', () => {
        const { commands } = boot()
        expect(commands[0]).toEqual([
            'consent',
            'default',
            expect.objectContaining({
                analytics_storage: 'denied',
                ad_storage: 'denied',
                region: [...CONSENT_REGIONS],
            }),
        ])
        expect(CONSENT_REGIONS).toContain('CA-QC')
        expect(CONSENT_REGIONS).toContain('GB')
        expect(CONSENT_REGIONS).toContain('CH')
        expect(commands[1]).toEqual([
            'consent',
            'default',
            expect.objectContaining({
                analytics_storage: 'granted',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500,
            }),
        ])
    })

    it('outside the asked zones: analytics granted and GA loads', () => {
        const { consent, scripts } = boot()
        expect(consent.state).toBe('granted')
        expect(scripts).toEqual([GTAG])
    })

    it('waits for a first interaction to load GA, and loads it only once', () => {
        const { scripts, timers, listeners } = boot({ holdTimers: true })
        expect(scripts).toEqual([])
        expect([...listeners.keys()]).toEqual([
            'pointerdown',
            'keydown',
            'scroll',
            'touchstart',
            'wheel',
        ])
        listeners.get('scroll')!()
        expect(scripts).toEqual([GTAG])
        expect(listeners.size).toBe(0)
        // The grace timer firing later doesn't load it again.
        for (const { fn } of timers) fn()
        expect(scripts).toHaveLength(1)
    })

    it(`with no interaction, loads GA ${GA_GRACE_MS / 1000}s after the page has loaded`, () => {
        const { scripts, timers, listeners } = boot({ holdTimers: true })
        expect(timers.map((t) => t.ms)).toEqual([GA_GRACE_MS])
        timers[0].fn()
        expect(scripts).toHaveLength(1)
        expect(listeners.size).toBe(0)
    })

    it(`waits for an idle moment for at most ${GA_IDLE_TIMEOUT_MS / 1000}s, so a busy page still loads GA`, () => {
        const { scripts, idleTimeouts } = boot()
        expect(idleTimeouts).toEqual([GA_IDLE_TIMEOUT_MS])
        expect(scripts).toHaveLength(1)
    })

    it('an Accept loads GA at once, without waiting for the grace period', () => {
        const run = boot({ timeZone: 'Europe/Berlin', holdTimers: true })
        expect(run.scripts).toEqual([])
        run.consent.set('granted')
        expect(run.scripts).toHaveLength(1)
    })

    it.each(['Europe/Berlin', 'Europe/London', 'America/Toronto'])(
        'in %s with no choice: pending, GA not loaded',
        (timeZone) => {
            const { consent, scripts } = boot({ timeZone })
            expect(consent).toMatchObject({ state: 'pending', ask: true, choice: null })
            expect(scripts).toEqual([])
        }
    )

    it('Global Privacy Control declines everywhere when there is no choice', () => {
        for (const timeZone of ['America/Los_Angeles', 'Europe/Berlin']) {
            const { consent, scripts, commands, cookieWrites } = boot({ timeZone, gpc: true })
            expect(consent).toMatchObject({ state: 'denied', gpc: true, choice: null })
            expect(scripts).toEqual([])
            expect(commands).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }])
            expect(cookieWrites).toEqual([])
        }
    })

    it('a choice beats Global Privacy Control', () => {
        const { consent, scripts } = boot({ gpc: true, cookie: `${CONSENT_COOKIE}=granted` })
        expect(consent).toMatchObject({ state: 'granted', gpc: false })
        expect(scripts).toHaveLength(1)
    })

    it('reads the shared cookie first, ahead of localStorage', () => {
        const { consent, scripts, commands } = boot({
            timeZone: 'Europe/Berlin',
            cookie: `${CONSENT_COOKIE}=denied`,
            stored: 'granted',
        })
        expect(consent.state).toBe('denied')
        expect(scripts).toEqual([])
        expect(commands).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }])
    })

    it('finds the cookie wherever it sits in document.cookie', () => {
        // Browsers separate cookies with "; ", and n8-consent is often not the
        // first one (an Auth.js or child safety cookie can come before it).
        const { consent, scripts } = boot({
            timeZone: 'Europe/Berlin',
            cookie: `nettrailer_child_safety=false; ${CONSENT_COOKIE}=denied; other=1`,
        })
        expect(consent).toMatchObject({ state: 'denied', choice: 'denied' })
        expect(scripts).toEqual([])
    })

    it("doesn't take a cookie whose name only ends in n8-consent", () => {
        const { consent } = boot({
            timeZone: 'Europe/Berlin',
            cookie: `x-${CONSENT_COOKIE}=granted`,
        })
        expect(consent.state).toBe('pending')
    })

    it('migrates a localStorage choice into the cookie', () => {
        const { consent, cookieWrites, scripts } = boot({
            timeZone: 'Europe/Berlin',
            stored: 'granted',
        })
        expect(consent.state).toBe('granted')
        expect(scripts).toHaveLength(1)
        expect(cookieWrites).toEqual([
            `${CONSENT_COOKIE}=granted; Max-Age=31536000; Path=/; SameSite=Lax; Domain=.n8builds.dev; Secure`,
        ])
    })

    it('ignores junk values', () => {
        const { consent } = boot({
            timeZone: 'Europe/Berlin',
            cookie: `${CONSENT_COOKIE}=maybe`,
            stored: 'yes',
        })
        expect(consent.state).toBe('pending')
    })

    it('accepting stores the cookie on .n8builds.dev, updates consent and loads GA', () => {
        const run = boot({ timeZone: 'Europe/Berlin' })
        run.consent.set('granted')
        expect(run.cookieWrites).toEqual([
            `${CONSENT_COOKIE}=granted; Max-Age=31536000; Path=/; SameSite=Lax; Domain=.n8builds.dev; Secure`,
        ])
        expect(run.storage.get(CONSENT_STORAGE_KEY)).toBe('granted')
        expect(run.commands.at(-1)).toEqual(['consent', 'update', { analytics_storage: 'granted' }])
        expect(run.scripts).toHaveLength(1)
        expect(run.events).toEqual(['n8:consent-change'])
        expect(run.consent).toMatchObject({ state: 'granted', choice: 'granted' })
    })

    it('declining stores the choice and deletes existing GA cookies', () => {
        const run = boot({ cookie: '_ga=GA1.1.1; _ga_JZQGKY9Q37=GS1; other=1' })
        run.consent.set('denied')
        expect(run.jar.get(CONSENT_COOKIE)).toBe('denied')
        expect(run.jar.has('_ga')).toBe(false)
        expect(run.jar.has('_ga_JZQGKY9Q37')).toBe(false)
        expect(run.jar.get('other')).toBe('1')
        expect(run.cookieWrites).toContain('_ga=; Max-Age=0; Path=/; Domain=n8builds.dev')
    })

    it('off n8builds.dev (localhost, plain http) the cookie is host-only and not Secure', () => {
        const run = boot({ hostname: 'localhost', protocol: 'http:' })
        run.consent.set('denied')
        expect(run.cookieWrites[0]).toBe(
            `${CONSENT_COOKIE}=denied; Max-Age=31536000; Path=/; SameSite=Lax`
        )
    })

    it("doesn't treat a look-alike domain as n8builds.dev", () => {
        const run = boot({ hostname: 'evil-n8builds.dev' })
        run.consent.set('denied')
        expect(run.cookieWrites[0]).not.toContain('Domain')
    })
})
