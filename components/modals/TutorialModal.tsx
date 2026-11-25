'use client'

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import Link from '@/components/common/Link'
import { ChevronRightIcon, LockClosedIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useChildSafety } from '../../hooks/useChildSafety'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useToast } from '../../hooks/useToast'
import { useLayoutContext } from '../../contexts/LayoutContext'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import {
    HELP_CATEGORIES,
    HELP_TILES,
    HELP_TOUR,
    type HelpTarget,
    type HelpTile,
} from '../../constants/helpContent'
import { HELP_ICONS } from './helpIcons'
import { focusHeaderSearch, focusMoodBox, openRandomTitle, pointAtMoodMic } from './helpActions'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
    /** Starts the interactive tour (ClientLayout goes home first); the strip is hidden without it. */
    onStartTour?: () => void
    /** Reopen the short first-visit welcome */
    onOpenWelcome?: () => void
}

/** How long the detail line takes to fade out, and then in, when the tile changes. */
export const DETAIL_FADE_MS = 140

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'

const footerLink = `inline-flex min-h-11 items-center rounded text-gray-400 underline decoration-gray-600 underline-offset-[3px] transition-colors hover:text-white hover:decoration-gray-300 ${focusRing}`

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
}

/**
 * Keyboard shortcuts only work with a keyboard on a wide screen
 * (hooks/useKeyboardShortcuts.ts turns them off on touch and below 1024 px),
 * so the Shortcuts link shows only there.
 */
function useHasShortcuts(): boolean {
    const [has, setHas] = useState(false)
    useEffect(() => {
        const check = () =>
            setHas(
                !('ontouchstart' in window) &&
                    navigator.maxTouchPoints === 0 &&
                    window.innerWidth >= 1024
            )
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return has
}

/**
 * "Help & tutorial": the tour on top, then every feature as a small tile under
 * four headings (Search, Your library, Community, Profile). Tapping a tile
 * shows one line about it and a link to it. Fits one phone screen; a centered
 * dialog with four tiles a row on wide screens. Copy: constants/helpContent.ts.
 */
export default function TutorialModal({
    isOpen,
    onClose,
    onStartTour,
    onOpenWelcome,
}: TutorialModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const tilesRef = useRef<HTMLDivElement>(null)
    const ids = useId()
    const router = useRouter()
    const pathname = usePathname()
    const { isGuest } = useAuthStatus()
    const userId = useSessionStore((state) => state.getUserId())
    const openAuthModal = useModalStore((state) => state.openAuthModal)
    const openModal = useModalStore((state) => state.openModal)
    const { isEnabled: childSafetyMode } = useChildSafety()
    const { showError } = useToast()
    const { onOpenAboutModal, onOpenKeyboardShortcuts } = useLayoutContext()
    const hasShortcuts = useHasShortcuts()

    const [selectedId, setSelectedId] = useState(HELP_TILES[0].id)
    // The tile whose line is on screen; it trails the selection by one fade-out
    const [shownId, setShownId] = useState(HELP_TILES[0].id)
    const [fading, setFading] = useState(false)
    const fadeTimer = useRef<number | undefined>(undefined)

    useEscapeKey(isOpen, onClose)
    useFocusTrap(dialogRef, isOpen)

    useEffect(() => {
        if (!isOpen) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [isOpen])

    useEffect(() => () => window.clearTimeout(fadeTimer.current), [])

    const select = useCallback(
        (id: string) => {
            if (id === selectedId) return
            setSelectedId(id)
            window.clearTimeout(fadeTimer.current)
            if (prefersReducedMotion()) {
                setShownId(id)
                setFading(false)
                return
            }
            // Fade the old line out, swap it, fade the new one in
            setFading(true)
            fadeTimer.current = window.setTimeout(() => {
                setShownId(id)
                setFading(false)
            }, DETAIL_FADE_MS)
        },
        [selectedId]
    )

    /** Arrow keys, Home and End move between tiles; Enter and Space select (native buttons). */
    const onTileKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
        if (!keys.includes(event.key)) return
        const tiles = Array.from(
            tilesRef.current?.querySelectorAll<HTMLButtonElement>('[data-help-tile]') ?? []
        )
        const index = tiles.indexOf(event.currentTarget)
        if (index < 0) return
        event.preventDefault()
        let next = index
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1
        if (event.key === 'Home') next = 0
        if (event.key === 'End') next = tiles.length - 1
        tiles[(next + tiles.length) % tiles.length]?.focus()
    }

    if (!isOpen) return null

    const titleId = `${ids}-title`
    const detailId = `${ids}-detail`
    const shown = HELP_TILES.find((tile) => tile.id === shownId) ?? HELP_TILES[0]
    const isLocked = (tile: HelpTile) => isGuest && !!tile.needsAccount
    const lineFor = (tile: HelpTile) => (isGuest && tile.guestLine) || tile.line

    const startTour = () => {
        onClose()
        onStartTour?.()
    }

    const signIn = () => {
        onClose()
        openAuthModal('signin')
    }

    const runTarget = (target: HelpTarget) => {
        onClose()
        const navigate = (href: string) => router.push(href)
        switch (target.kind) {
            case 'header-search':
                // After the window is gone, so focus does not return to the opener over it
                window.setTimeout(focusHeaderSearch, 0)
                break
            case 'mood-box':
                focusMoodBox(pathname, navigate)
                break
            case 'mood-voice':
                pointAtMoodMic(pathname, navigate)
                break
            case 'surprise':
                void openRandomTitle(childSafetyMode, openModal, () =>
                    showError('No surprise this time', 'Please try again.')
                )
                break
        }
    }

    const hrefFor = (target: HelpTarget): string | null => {
        if (target.kind === 'page') return target.href
        if (target.kind === 'public-profile') return userId ? `/users/${userId}` : '/profile'
        return null
    }

    const detailAction = () => {
        const linkClass = `-my-1 -mr-1 inline-flex min-h-11 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg px-2 text-[0.84rem] font-bold text-brand-400 transition-colors hover:text-brand-300 ${focusRing}`
        const label = (text: string) => (
            <>
                {text}
                <ChevronRightIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                <span className="sr-only">: {shown.name}</span>
            </>
        )
        if (isLocked(shown)) {
            return (
                <button type="button" onClick={signIn} className={linkClass}>
                    {label('Sign in')}
                </button>
            )
        }
        const href = hrefFor(shown.target)
        if (href) {
            return (
                <Link href={href} onClick={onClose} className={linkClass}>
                    {label('Open')}
                </Link>
            )
        }
        return (
            <button type="button" onClick={() => runTarget(shown.target)} className={linkClass}>
                {label('Open')}
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid="help-dialog"
                className="relative flex max-h-full w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl outline-none md:max-w-[760px]"
            >
                {/* Header */}
                <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-800 py-2.5 pl-4 pr-1.5 md:pl-5">
                    <Image
                        src="/nettrailers-mark.svg"
                        width={26}
                        height={26}
                        alt=""
                        unoptimized
                        className="h-[26px] w-[26px] shrink-0"
                    />
                    <h2
                        id={titleId}
                        className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[1.1rem] font-bold text-white"
                    >
                        NetTrailers
                        <span className="text-[0.85rem] font-medium text-gray-400">Help</span>
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close help"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
                    >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto overscroll-contain px-3.5 pb-3 md:px-5">
                    {/* The tour, for guests and signed-in visitors alike */}
                    {onStartTour && (
                        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-brand-500/50 py-2.5 pl-3.5 pr-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-[0.95rem] font-bold leading-snug text-white">
                                    {HELP_TOUR.title}
                                </p>
                                <p className="text-[0.8rem] leading-snug text-gray-400">
                                    {HELP_TOUR.subtitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={startTour}
                                className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg bg-brand-500 px-3.5 text-[0.88rem] font-bold text-white transition-[background-color,box-shadow,scale] duration-150 hover:bg-[#f6121d] hover:shadow-[0_6px_18px_-6px_rgba(229,9,20,0.7)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${focusRing}`}
                            >
                                Start tour
                            </button>
                        </div>
                    )}

                    {/* Every feature, under four headings */}
                    <div
                        ref={tilesRef}
                        className="mt-3 flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-3"
                    >
                        {HELP_CATEGORIES.map((category) => {
                            const headingId = `${ids}-${category.id}`
                            const wide = category.tiles.length > 2
                            return (
                                <section
                                    key={category.id}
                                    aria-labelledby={headingId}
                                    className={`flex flex-col gap-1.5 ${wide ? 'md:col-span-2' : ''}`}
                                >
                                    <h3
                                        id={headingId}
                                        className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-gray-400"
                                    >
                                        {category.title}
                                    </h3>
                                    <div
                                        role="group"
                                        aria-labelledby={headingId}
                                        className={`grid grid-cols-2 gap-1.5 ${wide ? 'md:grid-cols-4' : ''}`}
                                    >
                                        {category.tiles.map((tile) => (
                                            <HelpTileButton
                                                key={tile.id}
                                                tile={tile}
                                                selected={tile.id === selectedId}
                                                locked={isLocked(tile)}
                                                controls={detailId}
                                                onSelect={() => select(tile.id)}
                                                onKeyDown={onTileKeyDown}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )
                        })}
                    </div>

                    {/* The selected feature: one line and a link to it */}
                    <div
                        id={detailId}
                        data-testid="help-detail"
                        className="mt-2.5 flex min-h-[58px] items-center gap-2.5 rounded-[10px] border border-zinc-800 bg-[#111114] py-2 pl-3 pr-2"
                    >
                        <div
                            className={`flex min-w-0 flex-1 items-center gap-2.5 transition-[opacity,translate] duration-[140ms] ease-out motion-reduce:transition-none ${
                                fading ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
                            }`}
                        >
                            <p
                                aria-live="polite"
                                className="min-w-0 flex-1 text-[0.84rem] leading-[1.35] text-zinc-300"
                            >
                                {lineFor(shown)}
                            </p>
                            {detailAction()}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-4 border-t border-zinc-800 px-4 pb-[max(0rem,env(safe-area-inset-bottom))] text-[0.8rem] md:px-5">
                    {onOpenAboutModal && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose()
                                onOpenAboutModal()
                            }}
                            className={footerLink}
                        >
                            About this project
                        </button>
                    )}
                    {onOpenWelcome && (
                        <button type="button" onClick={onOpenWelcome} className={footerLink}>
                            Show the welcome
                        </button>
                    )}
                    {hasShortcuts && onOpenKeyboardShortcuts && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose()
                                onOpenKeyboardShortcuts()
                            }}
                            className={footerLink}
                        >
                            Shortcuts
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function HelpTileButton({
    tile,
    selected,
    locked,
    controls,
    onSelect,
    onKeyDown,
}: {
    tile: HelpTile
    selected: boolean
    locked: boolean
    controls: string
    onSelect: () => void
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}) {
    const Icon = HELP_ICONS[tile.icon]
    const state = selected
        ? 'border-brand-500 bg-[#1d0d0f] shadow-[0_0_0_1px_rgba(229,9,20,0.35),0_6px_18px_-8px_rgba(229,9,20,0.6)] hover:border-brand-400 hover:bg-[#231013]'
        : 'border-zinc-800 bg-[#16161a] hover:border-zinc-700 hover:bg-[#1c1c21]'
    const iconColor = locked ? 'text-gray-500' : selected ? 'text-brand-300' : 'text-brand-400'
    return (
        <button
            type="button"
            data-help-tile={tile.id}
            aria-pressed={selected}
            aria-controls={controls}
            onClick={onSelect}
            onKeyDown={onKeyDown}
            className={`group flex min-h-11 min-w-0 items-center gap-[9px] rounded-[10px] border px-2.5 py-1.5 text-left text-[0.84rem] font-semibold leading-tight transition-[border-color,background-color,box-shadow,translate,scale] duration-[180ms] ease-out hover:-translate-y-px active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${state} ${locked ? 'text-zinc-300' : 'text-white'} ${focusRing}`}
        >
            <Icon
                aria-hidden="true"
                strokeWidth={1.7}
                className={`h-5 w-5 shrink-0 transition-[scale,color] duration-[180ms] ease-out group-hover:scale-[1.12] motion-reduce:transition-none ${selected ? 'scale-[1.12]' : ''} ${iconColor}`}
            />
            <span className="min-w-0 flex-1">{tile.name}</span>
            {locked && (
                <>
                    <LockClosedIcon
                        aria-hidden="true"
                        strokeWidth={1.7}
                        className="h-3.5 w-3.5 shrink-0 text-gray-500"
                    />
                    <span className="sr-only">(needs an account)</span>
                </>
            )}
        </button>
    )
}
