'use client'

import { useCallback, useEffect, useId, useRef, useState, type TransitionEvent } from 'react'
import Link from '@/components/common/Link'
import { Check, Cookie } from 'lucide-react'
import { getConsent, type ConsentChoice } from '@/lib/consent'

/**
 * The analytics consent banner: a bar centred at the bottom of the screen
 * (text left, buttons right from sm up; stacked on phones). It never blocks
 * the page: no backdrop, no scroll lock, no focus trap. Accept is the larger,
 * brand-coloured button; Decline is a smaller secondary button beside it,
 * still solid, readable and one click away.
 *
 * Ported from n8builds.dev (components/consent/ConsentBanner.tsx in
 * n8watkins/n8builds-web) and restyled to NetTrailers' red on near-black. The
 * enter and exit are CSS transitions (opacity and transform only, on a fixed
 * element, so nothing shifts); reduced motion skips them.
 */
export default function ConsentBanner({
    fromSettings,
    returnFocusTo,
    onClosed,
}: {
    /** Opened from "Cookie settings" (not the first-visit question). */
    fromSettings: boolean
    /** Where focus goes when the bar closes (the "Cookie settings" button), if anywhere. */
    returnFocusTo: HTMLElement | null
    /** Called once the exit transition is over, to unmount the bar. */
    onClosed: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const bodyId = useId()
    const consent = getConsent()
    const current = consent?.state
    const [shown, setShown] = useState(false)
    const [closing, setClosing] = useState(false)
    const finish = useRef<(() => void) | null>(null)

    // Enter: rendered hidden, then shown on the next frame so it fades up.
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setShown(true))
        return () => window.cancelAnimationFrame(frame)
    }, [])

    /**
     * Closes the bar: focus moves on at once (back to "Cookie settings", or
     * off the bar if it was inside it), then the bar fades and slides down
     * (instant under reduced motion), then the choice, if any, is applied and
     * the bar unmounts.
     */
    const close = useCallback(
        (choice?: ConsentChoice) => {
            if (finish.current) return
            let done = false
            finish.current = () => {
                if (done) return
                done = true
                if (choice) getConsent()?.set(choice)
                onClosed()
            }
            const active = document.activeElement
            const focusInside = active instanceof HTMLElement && ref.current?.contains(active)
            if (returnFocusTo) returnFocusTo.focus()
            else if (focusInside) active.blur()
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                finish.current()
                return
            }
            setClosing(true)
            // In case transitionend never fires (a hidden tab, say).
            window.setTimeout(() => finish.current?.(), 500)
        },
        [onClosed, returnFocusTo]
    )

    const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
        if (closing && event.target === event.currentTarget && event.propertyName === 'opacity') {
            finish.current?.()
        }
    }

    // Opened from "Cookie settings": move focus to the bar itself (not to
    // either button, so neither is favoured), and Escape closes it.
    useEffect(() => {
        if (!fromSettings) return
        ref.current?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [fromSettings, close])

    // Where the bar reaches the bottom-right corner (phones and narrower
    // laptops), anything floating there can rise above it while it's open
    // (--consent-banner-h, as on n8builds.dev).
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const root = document.documentElement
        const update = () => {
            const rect = el.getBoundingClientRect()
            const reachesCorner = rect.right > window.innerWidth - 88
            root.style.setProperty(
                '--consent-banner-h',
                reachesCorner ? `${window.innerHeight - rect.top}px` : '0px'
            )
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        window.addEventListener('resize', update)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', update)
            root.style.removeProperty('--consent-banner-h')
        }
    }, [])

    const visible = shown && !closing
    const focusRing =
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'

    return (
        <div
            ref={ref}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            tabIndex={-1}
            inert={closing}
            data-closing={closing || undefined}
            onTransitionEnd={onTransitionEnd}
            className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-[100000] mx-auto max-w-[62rem] rounded-2xl border border-zinc-700 bg-[#0d0d0f]/95 p-5 text-gray-300 shadow-[0_22px_60px_-12px_rgba(0,0,0,0.9)] outline-none backdrop-blur-md transition-[opacity,transform] motion-reduce:transition-none sm:bottom-6 sm:flex sm:items-center sm:gap-8 sm:px-7 sm:py-6 ${
                visible
                    ? 'translate-y-0 opacity-100 duration-500 ease-out'
                    : `${closing ? 'translate-y-6 duration-200 ease-in' : 'translate-y-4'} opacity-0`
            }`}
        >
            <div className="min-w-0 flex-1">
                <h2
                    id={titleId}
                    className="flex items-center gap-2 text-[1.05rem] font-bold text-white"
                >
                    <Cookie aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-400" />
                    Cookies
                </h2>
                <p id={bodyId} className="mt-1.5 text-[0.92rem] leading-relaxed text-gray-300">
                    I use cookies to understand how people use the site so I can improve it. No ads.
                    The site works the same either way.{' '}
                    <Link
                        href="/privacy#cookies"
                        className={`rounded font-medium text-brand-400 underline underline-offset-2 hover:text-brand-300 ${focusRing}`}
                    >
                        Privacy
                    </Link>
                </p>
                {fromSettings && current && current !== 'pending' && (
                    <p className="mt-1.5 text-xs text-gray-400">
                        Currently: {current === 'granted' ? 'accepted' : 'declined'}
                        {consent?.gpc && ' (Global Privacy Control)'}
                    </p>
                )}
            </div>
            {/* Accept is the inviting one; Decline stays a real, readable button right beside it. */}
            <div className="mt-4 flex shrink-0 items-center gap-3 sm:mt-0">
                <button
                    type="button"
                    className={`h-11 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-4 text-sm font-semibold text-gray-100 transition-colors hover:bg-zinc-700 ${focusRing}`}
                    onClick={() => close('denied')}
                >
                    Decline
                </button>
                <button
                    type="button"
                    className={`flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-500 px-7 text-base font-bold text-white shadow-lg shadow-black/50 transition-colors hover:bg-brand-600 sm:flex-none ${focusRing}`}
                    onClick={() => close('granted')}
                >
                    <Check aria-hidden="true" className="h-5 w-5" />
                    Accept
                </button>
            </div>
        </div>
    )
}
