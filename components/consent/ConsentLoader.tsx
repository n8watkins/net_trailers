'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { CONSENT_CHANGE_EVENT, CONSENT_OPEN_EVENT, getConsent } from '@/lib/consent'

// The banner is downloaded only for visitors who see it: a European or Quebec
// visitor who hasn't chosen yet, or anyone who opens "Cookie settings".
const ConsentBanner = dynamic(() => import('./ConsentBanner'), { ssr: false })

function subscribe(onChange: () => void) {
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
}

/**
 * A visitor from a European or Quebec time zone who hasn't chosen yet, and
 * sends no Global Privacy Control signal (GA waits for the answer).
 */
function needsAnswer() {
    return getConsent()?.state === 'pending'
}

export default function ConsentLoader() {
    const mustAsk = useSyncExternalStore(subscribe, needsAnswer, () => false)
    // Opened from "Cookie settings": remembers the button, to give focus back.
    const [settings, setSettings] = useState<{ opener: HTMLElement | null } | null>(null)

    useEffect(() => {
        const onOpen = (event: Event) => {
            const opener =
                event instanceof CustomEvent && event.detail instanceof HTMLElement
                    ? event.detail
                    : null
            setSettings({ opener })
        }
        window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
        return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
    }, [])

    if (!getConsent() || (!mustAsk && !settings)) return null
    return (
        <ConsentBanner
            // A fresh bar (and exit animation) each time it opens.
            key={settings ? 'settings' : 'ask'}
            fromSettings={Boolean(settings)}
            returnFocusTo={settings?.opener ?? null}
            onClosed={() => setSettings(null)}
        />
    )
}
