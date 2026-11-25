import type { ReactNode } from 'react'
import Image from 'next/image'

export const N8BUILDS_HREF = 'https://n8builds.dev'

interface N8buildsLinkProps {
    /** Link text; defaults to the domain. */
    children?: ReactNode
    /** Icon edge in px (the file is 48 px, so 24 is the largest that stays sharp on 2x screens). */
    iconSize?: 16 | 20 | 24
    /** Give the link a tap target of at least 40 px (use in the footer and other touch spots). */
    tapTarget?: boolean
    className?: string
}

const focusRing =
    'rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]'

/**
 * The one way the app names n8builds: the n8builds icon beside the text, as a
 * link that opens https://n8builds.dev in a new tab.
 */
export default function N8buildsLink({
    children = 'n8builds.dev',
    iconSize = 20,
    tapTarget = false,
    className = '',
}: N8buildsLinkProps) {
    return (
        <a
            href={N8BUILDS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="n8builds-link"
            className={`inline-flex items-center gap-2 transition-colors ${
                tapTarget ? 'min-h-10' : ''
            } ${focusRing} ${className}`}
        >
            <Image
                src="/brand/n8builds-mark-48.png"
                width={iconSize}
                height={iconSize}
                alt=""
                unoptimized
                style={{ width: iconSize, height: iconSize }}
                className="shrink-0 rounded-[4px]"
            />
            <span>{children}</span>
            <span className="sr-only"> (opens in a new tab)</span>
        </a>
    )
}
