'use client'

import { CONSENT_OPEN_EVENT } from '@/lib/consent'

/** The footer's "Cookie settings" link: opens the consent banner for anyone. */
export default function CookieSettingsButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            className={className}
            onClick={(event) =>
                window.dispatchEvent(
                    new CustomEvent(CONSENT_OPEN_EVENT, { detail: event.currentTarget })
                )
            }
        >
            Cookie settings
        </button>
    )
}
