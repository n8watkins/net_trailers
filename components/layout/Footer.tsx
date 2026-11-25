import React from 'react'
import Link from '@/components/common/Link'
import Image from 'next/image'
import CookieSettingsButton from '@/components/consent/CookieSettingsButton'
import N8buildsLink from '@/components/common/N8buildsLink'

interface FooterProps {
    showAboutModal: boolean
    onOpenAboutModal: () => void
    onCloseAboutModal: () => void
    onOpenKeyboardShortcuts?: () => void
    onOpenTutorial?: () => void
    onOpenWelcome?: () => void
}

const focusRing =
    'rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]'
// min-h-10 keeps every footer link a 40 px tap target; the lists add no gap of their own
const linkClass = `inline-flex min-h-10 items-center text-sm text-gray-300 transition-colors duration-200 hover:text-white ${focusRing}`
const socialClass = `inline-flex h-10 w-10 items-center justify-center text-gray-400 transition-colors hover:text-brand-300 ${focusRing}`
const headingClass = 'mb-3 text-sm font-semibold uppercase tracking-wide text-brand-400'

/**
 * Compact site footer: three short groups (Navigate, Project, Help & legal).
 * Genre links live in the header's Genres menu, so they are not repeated here.
 */
function Footer({
    onOpenAboutModal,
    onOpenKeyboardShortcuts,
    onOpenTutorial,
    onOpenWelcome,
}: FooterProps) {
    return (
        <footer className="border-t border-gray-800 bg-[#0a0a0a]">
            <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[auto_auto_auto] md:justify-between md:gap-x-16">
                    <nav aria-label="Footer navigation">
                        <h3 className={headingClass}>Navigate</h3>
                        <ul>
                            <li>
                                <Link href="/" className={linkClass}>
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/search" className={linkClass}>
                                    Search
                                </Link>
                            </li>
                            <li>
                                <Link href="/collections" className={linkClass}>
                                    Collections
                                </Link>
                            </li>
                            <li>
                                <Link href="/community/rankings" className={linkClass}>
                                    Community
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    <div>
                        <h3 className={headingClass}>Project</h3>
                        <ul>
                            <li>
                                <button
                                    type="button"
                                    onClick={onOpenAboutModal}
                                    className={linkClass}
                                >
                                    About this project
                                </button>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/n8watkins/net_trailers"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={linkClass}
                                >
                                    Source code
                                </a>
                            </li>
                        </ul>
                        <div className="-ml-2.5 mt-2 flex items-center">
                            <a
                                href="https://github.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialClass}
                                aria-label="GitHub"
                            >
                                <svg
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {' '}
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />{' '}
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialClass}
                                aria-label="LinkedIn"
                            >
                                <svg
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {' '}
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />{' '}
                                </svg>
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialClass}
                                aria-label="Twitter/X"
                            >
                                <svg
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {' '}
                                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />{' '}
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <h3 className={headingClass}>Help &amp; legal</h3>
                        <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-1">
                            {onOpenWelcome && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={onOpenWelcome}
                                        className={linkClass}
                                    >
                                        Welcome
                                    </button>
                                </li>
                            )}
                            {onOpenTutorial && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={onOpenTutorial}
                                        className={linkClass}
                                    >
                                        Help &amp; tutorial
                                    </button>
                                </li>
                            )}
                            {onOpenKeyboardShortcuts && (
                                <li className="hidden lg:list-item">
                                    <button
                                        type="button"
                                        onClick={onOpenKeyboardShortcuts}
                                        className={linkClass}
                                    >
                                        Keyboard shortcuts
                                    </button>
                                </li>
                            )}
                            <li>
                                <a
                                    href="https://github.com/n8watkins/net_trailers/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={linkClass}
                                >
                                    Contact
                                </a>
                            </li>
                            <li>
                                <Link href="/privacy" className={linkClass}>
                                    Privacy
                                </Link>
                            </li>
                            {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
                                <li>
                                    <CookieSettingsButton className={linkClass} />
                                </li>
                            )}
                            <li>
                                <Link href="/terms" className={linkClass}>
                                    Terms
                                </Link>
                            </li>
                            <li>
                                <Link href="/security" className={linkClass}>
                                    Security
                                </Link>
                            </li>
                            <li>
                                <Link href="/changelog" className={linkClass}>
                                    Changelog
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-2 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Image
                            src="/nettrailers-logo.svg"
                            alt="NetTrailers"
                            width={274}
                            height={52}
                            unoptimized
                            className="h-5 w-auto"
                        />
                        <span className="text-xs text-gray-400">
                            © {new Date().getFullYear()} Nathan Watkins
                        </span>
                    </div>
                    <N8buildsLink tapTarget className="text-sm text-gray-300 hover:text-white">
                        Built by Nate at n8builds.dev
                    </N8buildsLink>
                </div>

                <div
                    data-testid="tmdb-credit"
                    className="mt-2 flex flex-col gap-1 border-t border-gray-800/70 pt-2 sm:flex-row sm:items-center sm:gap-4"
                >
                    <a
                        href="https://www.themoviedb.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="The Movie Database (TMDB)"
                        className={`inline-flex min-h-10 shrink-0 items-center ${focusRing}`}
                    >
                        <Image
                            src="/brand/tmdb-logo.svg"
                            alt=""
                            width={273}
                            height={36}
                            unoptimized
                            className="h-3.5 w-auto"
                        />
                    </a>
                    <p className="text-xs leading-snug text-gray-400">
                        This product uses the TMDB API but is not endorsed or certified by TMDB.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
