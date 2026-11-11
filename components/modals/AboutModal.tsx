'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    XMarkIcon,
    ArrowTopRightOnSquareIcon,
    ChevronDownIcon,
    ArrowRightIcon,
    CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import {
    ABOUT_HIGHLIGHTS,
    ABOUT_LINKS,
    ABOUT_STACK,
    ABOUT_STEPS,
    ABOUT_SUMMARY,
    readStackVersions,
} from '../../constants/aboutContent'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
    /** Starts the interactive tour; the "Show me around" button is hidden without it. */
    onStartTour?: () => void
    /** @deprecated The tutorial is no longer linked from About; kept so callers compile. */
    onOpenTutorial?: () => void
}

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'

/**
 * "About this project": what NetTrailers is, how to use it in four steps, and
 * what is under the hood. One card with two columns on desktop (no inner
 * scroll at 1440x900); a bottom sheet on phones with the engineering collapsed.
 */
export default function AboutModal({ isOpen, onClose, onStartTour }: AboutModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const [openHighlight, setOpenHighlight] = useState<string | null>(null)
    const [hoodOpen, setHoodOpen] = useState(false)
    const versions = useMemo(() => readStackVersions(), [])
    const ids = useId()

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

    if (!isOpen) return null

    const titleId = `${ids}-title`
    const hoodId = `${ids}-hood`

    const outboundBase = `inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm sm:px-3.5 font-semibold transition-colors ${focusRing}`

    return (
        <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4">
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
                data-testid="about-dialog"
                className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl outline-none sm:max-w-[900px] sm:rounded-2xl"
            >
                {/* Header: what it is and where to go next */}
                <div className="flex items-start gap-3 border-b border-zinc-800 px-5 pb-4 pt-5 sm:px-6">
                    <div className="min-w-0 flex-1">
                        <h2
                            id={titleId}
                            className="flex flex-wrap items-baseline gap-x-2 text-xl font-bold text-white"
                        >
                            <span>NetTrailers</span>
                            <span className="text-sm font-medium text-gray-400">
                                built by Nathan Watkins
                            </span>
                        </h2>
                        <p className="mt-1.5 max-w-[46rem] text-[15px] leading-snug text-gray-300 [text-wrap:pretty]">
                            {ABOUT_SUMMARY}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <a
                                href={ABOUT_LINKS.portfolio}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${outboundBase} bg-amber-500 text-zinc-950 hover:bg-amber-400`}
                            >
                                Portfolio
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                            </a>
                            <a
                                href={ABOUT_LINKS.writeUp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${outboundBase} border border-zinc-700 text-gray-100 hover:border-amber-500/60 hover:bg-zinc-900`}
                            >
                                <span className="sm:hidden">Write-up</span>
                                <span className="hidden sm:inline">Project write-up</span>
                            </a>
                            <a
                                href={ABOUT_LINKS.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${outboundBase} border border-zinc-700 text-gray-100 hover:border-amber-500/60 hover:bg-zinc-900`}
                            >
                                <Image
                                    src="/icons/github.svg"
                                    width={16}
                                    height={16}
                                    alt=""
                                    unoptimized
                                    className="h-4 w-4"
                                />
                                Source
                            </a>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close about"
                        className={`-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white ${focusRing}`}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="overflow-y-auto overscroll-contain md:grid md:grid-cols-2">
                    {/* How to use it */}
                    <section
                        aria-labelledby={`${ids}-how`}
                        className="px-5 py-4 sm:px-6 md:border-r md:border-zinc-800 md:py-5"
                    >
                        <h3
                            id={`${ids}-how`}
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400"
                        >
                            How to use it
                        </h3>
                        <ol className="mt-3 space-y-3">
                            {ABOUT_STEPS.map((step, index) => (
                                <li key={step.title} className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/50 text-sm font-semibold text-amber-400"
                                    >
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-semibold leading-7 text-white">
                                            {step.title}
                                        </p>
                                        <p className="text-sm leading-snug text-gray-400">
                                            {step.body}{' '}
                                            <Link
                                                href={step.action.href}
                                                onClick={onClose}
                                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded font-medium text-amber-400 hover:text-amber-300 ${focusRing}`}
                                            >
                                                {step.action.label}
                                                <ArrowRightIcon
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        {onStartTour && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose()
                                    onStartTour()
                                }}
                                className={`mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/60 px-4 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/10 ${focusRing}`}
                            >
                                <CursorArrowRaysIcon className="h-4 w-4" aria-hidden="true" />
                                Show me around
                            </button>
                        )}
                    </section>

                    {/* Under the hood: collapsed on phones, always open on desktop */}
                    <section
                        aria-labelledby={`${ids}-hood-title`}
                        className="border-t border-zinc-800 px-5 py-4 sm:px-6 md:border-t-0 md:py-5"
                    >
                        <h3 id={`${ids}-hood-title`} className="md:hidden">
                            <button
                                type="button"
                                aria-expanded={hoodOpen}
                                aria-controls={hoodId}
                                onClick={() => setHoodOpen((open) => !open)}
                                className={`flex w-full items-center justify-between rounded text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 ${focusRing}`}
                            >
                                Under the hood
                                <ChevronDownIcon
                                    className={`h-4 w-4 transition-transform ${hoodOpen ? 'rotate-180' : ''}`}
                                    aria-hidden="true"
                                />
                            </button>
                        </h3>
                        <p
                            aria-hidden="true"
                            className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 md:block"
                        >
                            Under the hood
                        </p>
                        <div id={hoodId} className={`${hoodOpen ? 'block' : 'hidden'} md:block`}>
                            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tech stack">
                                {ABOUT_STACK.map((chip) => {
                                    const version = chip.version ? versions[chip.version] : null
                                    return (
                                        <li
                                            key={chip.name}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/70 px-2.5 py-1 text-xs text-gray-200"
                                        >
                                            {chip.logo && (
                                                <Image
                                                    src={chip.logo}
                                                    width={14}
                                                    height={14}
                                                    alt=""
                                                    unoptimized
                                                    className="h-3.5 w-3.5"
                                                />
                                            )}
                                            {chip.name}
                                            {version && (
                                                <span className="text-gray-500">{version}</span>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>

                            <ul className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                                {ABOUT_HIGHLIGHTS.map((item) => {
                                    const open = openHighlight === item.id
                                    const panelId = `${ids}-${item.id}`
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                aria-controls={panelId}
                                                onClick={() =>
                                                    setOpenHighlight(open ? null : item.id)
                                                }
                                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-gray-100 hover:bg-zinc-900 ${focusRing}`}
                                            >
                                                {item.title}
                                                <ChevronDownIcon
                                                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180 text-amber-400' : ''}`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            <ul
                                                id={panelId}
                                                hidden={!open}
                                                className="list-disc space-y-1 pb-3 pl-8 pr-3.5 text-sm leading-snug text-gray-400 marker:text-amber-500/70"
                                            >
                                                {item.bullets.map((bullet) => (
                                                    <li key={bullet}>{bullet}</li>
                                                ))}
                                            </ul>
                                        </li>
                                    )
                                })}
                            </ul>

                            <p className="mt-3 flex gap-4 text-sm">
                                <Link
                                    href="/security"
                                    onClick={onClose}
                                    className={`rounded text-gray-400 underline-offset-2 hover:text-white hover:underline ${focusRing}`}
                                >
                                    Security
                                </Link>
                                <Link
                                    href="/changelog"
                                    onClick={onClose}
                                    className={`rounded text-gray-400 underline-offset-2 hover:text-white hover:underline ${focusRing}`}
                                >
                                    Changelog
                                </Link>
                            </p>
                        </div>
                    </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zinc-800 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 text-xs text-gray-500 sm:px-6">
                    <p>
                        NetTrailers is a portfolio project by{' '}
                        <a
                            href={ABOUT_LINKS.n8builds}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`rounded text-gray-300 underline-offset-2 hover:text-white hover:underline ${focusRing}`}
                        >
                            n8builds.dev
                        </a>
                    </p>
                    <p>Trailer data from TMDB</p>
                </div>
            </div>
        </div>
    )
}
