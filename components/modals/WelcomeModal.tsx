'use client'

import { useEffect, useRef } from 'react'
import Link from '@/components/common/Link'
import Image from 'next/image'
import {
    XMarkIcon,
    SparklesIcon,
    HeartIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface WelcomeModalProps {
    isOpen: boolean
    onClose: () => void
    onTryMood: () => void
    onOpenAbout: () => void
}

/**
 * A short first-visit welcome: what the app is and three ways in.
 * On phones it is a full-width sheet whose close button and main action
 * always stay on screen.
 */
export default function WelcomeModal({
    isOpen,
    onClose,
    onTryMood,
    onOpenAbout,
}: WelcomeModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    useEscapeKey(isOpen, onClose)

    useEffect(() => {
        if (!isOpen) return
        // Move focus into the dialog without lighting up a focus ring on the close button
        dialogRef.current?.focus()
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [isOpen])

    if (!isOpen) return null

    const itemClass =
        'flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition-colors hover:border-amber-500/60 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
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
                aria-labelledby="welcome-title"
                className="relative flex max-h-[92dvh] outline-none w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl sm:max-w-md sm:rounded-2xl"
            >
                <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div>
                        <Image
                            src="/nettrailers-logo.svg"
                            width={274}
                            height={52}
                            alt=""
                            unoptimized
                            className="mb-3 h-6 w-auto"
                        />
                        <h2 id="welcome-title" className="text-xl font-bold text-white">
                            Welcome to NetTrailers
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close welcome"
                        className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 pb-2 pt-2">
                    <p className="text-gray-300">
                        Describe a mood and AI finds movies and shows to match. Watch the trailers,
                        like what you love, and keep lists. No account needed.
                    </p>

                    <ul className="mt-4 space-y-2">
                        <li>
                            <button type="button" onClick={onTryMood} className={itemClass}>
                                <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                <span>
                                    <span className="block font-semibold text-white">
                                        Describe a mood
                                    </span>
                                    <span className="block text-sm text-gray-400">
                                        Type what you feel like watching. AI finds trailers to
                                        match.
                                    </span>
                                </span>
                            </button>
                        </li>
                        <li>
                            <Link href="/recommendations" onClick={onClose} className={itemClass}>
                                <HeartIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                <span>
                                    <span className="block font-semibold text-white">
                                        Pick 5 you love
                                    </span>
                                    <span className="block text-sm text-gray-400">
                                        Get your own For you picks, each with a reason.
                                    </span>
                                </span>
                            </Link>
                        </li>
                        <li>
                            <button type="button" onClick={onOpenAbout} className={itemClass}>
                                <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                <span>
                                    <span className="block font-semibold text-white">
                                        About this project
                                    </span>
                                    <span className="block text-sm text-gray-400">
                                        Who built it, how to use it, how it is built.
                                    </span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="border-t border-zinc-800 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 w-full rounded-lg bg-amber-500 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
                    >
                        Start exploring
                    </button>
                    <p className="mt-2 text-center text-xs text-gray-500">
                        Open this again any time from Help or your profile menu.
                    </p>
                </div>
            </div>
        </div>
    )
}
