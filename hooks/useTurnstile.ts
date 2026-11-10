'use client'

/**
 * Cloudflare Turnstile in the browser, for the email sign-in form. The widget
 * runs in the background as soon as the form shows: managed mode with
 * "interaction-only" appearance, so most people see nothing, and only when
 * Cloudflare is unsure a small challenge appears in the given container.
 *
 * A token is single use and lasts 300 s. The widget renews an expired one by
 * itself, and `takeToken` resets the widget after handing a token out, so a
 * second try gets a fresh one. The server checks it (lib/turnstile.ts).
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface TurnstileApi {
    render(container: HTMLElement, options: Record<string, unknown>): string
    reset(widgetId: string): void
    remove(widgetId: string): void
}

declare global {
    interface Window {
        turnstile?: TurnstileApi
    }
}

/**
 * The public site key, set at build time by the deploy workflow. Without it
 * (local runs, tests) Cloudflare's always-pass test key is used, which only a
 * test secret accepts.
 */
export const TURNSTILE_SITE_KEY =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** How long a submit waits for a token (a visible challenge needs a click). */
const TOKEN_WAIT_MS = 30_000

let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile)
    loading ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = SCRIPT
        script.async = true
        script.onload = () =>
            window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing'))
        script.onerror = () => {
            loading = null
            reject(new Error('turnstile failed to load'))
        }
        document.head.appendChild(script)
    })
    return loading
}

export function useTurnstile(container: RefObject<HTMLDivElement | null>, active: boolean) {
    const widgetId = useRef<string | null>(null)
    const token = useRef<string | null>(null)
    const waiters = useRef<Array<(token: string | null) => void>>([])
    // True while Cloudflare shows a challenge; otherwise the widget takes no room.
    const [challengeShown, setChallengeShown] = useState(false)

    const settle = (value: string | null) => {
        const pending = waiters.current
        waiters.current = []
        pending.forEach((resolve) => resolve(value))
    }

    useEffect(() => {
        if (!active || !container.current) return
        let cancelled = false
        loadTurnstile()
            .then((api) => {
                if (cancelled || !container.current) return
                widgetId.current = api.render(container.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    action: 'email-sign-in',
                    appearance: 'interaction-only',
                    theme: 'dark',
                    callback: (value: string) => {
                        token.current = value
                        settle(value)
                    },
                    'expired-callback': () => {
                        token.current = null
                    },
                    'before-interactive-callback': () => setChallengeShown(true),
                    'after-interactive-callback': () => setChallengeShown(false),
                })
            })
            .catch(() => settle(null))
        return () => {
            cancelled = true
            if (widgetId.current) window.turnstile?.remove(widgetId.current)
            widgetId.current = null
            token.current = null
            setChallengeShown(false)
            settle(null)
        }
    }, [active, container])

    /** The current token (waiting for it if needed), or null if none came. */
    const takeToken = useCallback(async (): Promise<string | null> => {
        let value = token.current
        if (!value) {
            value = await new Promise<string | null>((resolve) => {
                waiters.current.push(resolve)
                setTimeout(() => resolve(null), TOKEN_WAIT_MS)
            })
        }
        token.current = null
        // Single use: start on the next one straight away.
        if (value && widgetId.current) window.turnstile?.reset(widgetId.current)
        return value
    }, [])

    return { takeToken, challengeShown }
}
