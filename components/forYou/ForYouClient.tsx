'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
    ArrowPathIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import type { Content } from '../../typings'
import { getTitle } from '../../typings'
import { useLikedHidden } from '../../hooks/useLikedHidden'
import { useSessionStore } from '../../stores/sessionStore'
import { useAiQuotaStore } from '../../stores/aiQuotaStore'
import ContentCard from '../common/ContentCard'
import Header from '../layout/Header'
import AiQuotaLine from '../smartSearch/AiQuotaLine'
import type { ForYouAiStatus, ForYouPick } from '../../lib/forYou'

/** Picks needed before recommendations can be shown, and the number we ask for. */
export const MIN_PICKS = 3
export const TARGET_PICKS = 5
const MAX_SEEDS = 8

type Mode = 'pick' | 'results'

interface ForYouResponse {
    picks: ForYouPick[]
    ai: ForYouAiStatus
    notice: string | null
    quota: Parameters<ReturnType<typeof useAiQuotaStore.getState>['setQuota']>[0]
}

function keyOf(content: Pick<Content, 'id' | 'media_type'>): string {
    return `${content.media_type}-${content.id}`
}

function withMediaType(items: Content[], mediaType: 'movie' | 'tv'): Content[] {
    return items.map((item) => ({ ...item, media_type: item.media_type ?? mediaType }) as Content)
}

/** "Arrival, Heat and 3 more" */
export function describeSeeds(titles: string[]): string {
    if (titles.length <= 2) return titles.join(' and ')
    return `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`
}

export default function ForYouPage() {
    return (
        <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-black to-gray-900">
            <Header />
            <main className="relative px-4 pb-24 pt-28 sm:px-6 sm:pt-32 md:px-8 lg:px-16">
                <div className="mx-auto max-w-[1800px]">
                    <ForYouClient />
                </div>
            </main>
        </div>
    )
}

function ForYouClient() {
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { myRatings, hiddenMovies, rateContent, removeRating } = useLikedHidden()
    const setQuota = useAiQuotaStore((state) => state.setQuota)

    const liked = useMemo(
        () =>
            (myRatings ?? [])
                .filter((r) => r.rating === 'like')
                .sort((a, b) => b.ratedAt - a.ratedAt)
                .map((r) => r.content),
        [myRatings]
    )
    const likedKeys = useMemo(() => new Set(liked.map(keyOf)), [liked])

    // Until the visitor chooses, show results once they have enough picks. Derived
    // rather than decided once, because saved likes can load just after the session.
    const [chosenMode, setMode] = useState<Mode | null>(null)
    const mode: Mode | null =
        chosenMode ?? (isInitialized ? (liked.length >= MIN_PICKS ? 'results' : 'pick') : null)

    const toggleLove = useCallback(
        (content: Content) => {
            // Picking means the visitor is using the picker: stay on it
            setMode((current) => current ?? 'pick')
            if (likedKeys.has(keyOf(content))) void removeRating(content.id)
            else void rateContent(content, 'like')
        },
        [likedKeys, rateContent, removeRating]
    )

    if (mode === null) {
        return <div className="min-h-[50vh]" aria-busy="true" />
    }

    return mode === 'pick' ? (
        <TastePicker
            likedKeys={likedKeys}
            pickedCount={liked.length}
            onToggle={toggleLove}
            onDone={() => setMode('results')}
        />
    ) : (
        <ForYouResults
            liked={liked}
            excludeKeys={[
                ...(myRatings ?? []).map((r) => keyOf(r.content)),
                ...hiddenMovies.map(keyOf),
            ]}
            onChangePicks={() => setMode('pick')}
            onQuota={setQuota}
        />
    )
}

function TastePicker({
    likedKeys,
    pickedCount,
    onToggle,
    onDone,
}: {
    likedKeys: ReadonlySet<string>
    pickedCount: number
    onToggle: (content: Content) => void
    onDone: () => void
}) {
    const [popular, setPopular] = useState<Content[] | null>(null)
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Content[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [movies, tv] = await Promise.all([
                    fetch('/api/movies/trending').then((r) => (r.ok ? r.json() : { results: [] })),
                    fetch('/api/tv/trending').then((r) => (r.ok ? r.json() : { results: [] })),
                ])
                const m = withMediaType(movies.results ?? [], 'movie')
                const t = withMediaType(tv.results ?? [], 'tv')
                const mixed: Content[] = []
                for (let i = 0; i < Math.max(m.length, t.length); i++) {
                    if (m[i]) mixed.push(m[i])
                    if (t[i]) mixed.push(t[i])
                }
                if (!cancelled) setPopular(mixed.filter((c) => c.poster_path).slice(0, 30))
            } catch {
                if (!cancelled) setPopular([])
            }
        }
        void load()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        const trimmed = query.trim()
        if (trimmed.length < 2) {
            setSearchResults(null)
            return
        }
        const controller = new AbortController()
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const response = await fetch(
                    `/api/search?query=${encodeURIComponent(trimmed)}&page=1`,
                    { signal: controller.signal }
                )
                const data = response.ok ? await response.json() : { results: [] }
                setSearchResults(
                    (data.results ?? []).filter(
                        (c: Content) =>
                            c.poster_path && (c.media_type === 'movie' || c.media_type === 'tv')
                    )
                )
            } catch {
                if (!controller.signal.aborted) setSearchResults([])
            } finally {
                if (!controller.signal.aborted) setIsSearching(false)
            }
        }, 350)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query])

    const shown = searchResults ?? popular
    const remaining = Math.max(0, TARGET_PICKS - pickedCount)

    return (
        <div className="pb-28">
            <div className="max-w-2xl">
                <h1 className="text-[2rem] font-bold leading-10 text-white">Pick 5 you love</h1>
                <p className="mt-2 text-gray-400">
                    Tap movies or shows you love. AI uses them to find your next favourites and
                    tells you why.
                </p>
            </div>

            <div className="relative mt-6 max-w-xl">
                <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search to add a title..."
                    aria-label="Search to add a title"
                    className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-10 text-base text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:text-white"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-gray-500">
                {searchResults ? (isSearching ? 'Searching...' : 'Search results') : 'Popular now'}
            </h2>

            {shown === null ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800"
                        />
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <p className="mt-6 text-gray-400">
                    {searchResults
                        ? 'No titles match that search.'
                        : 'Could not load titles right now.'}
                </p>
            ) : (
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {shown.map((content) => {
                        const picked = likedKeys.has(keyOf(content))
                        const title = getTitle(content)
                        return (
                            <li key={keyOf(content)}>
                                <button
                                    type="button"
                                    onClick={() => onToggle(content)}
                                    aria-pressed={picked}
                                    aria-label={`${picked ? 'Remove' : 'Pick'} ${title}`}
                                    className="group block w-full text-left focus:outline-none"
                                >
                                    <span
                                        className={`relative block aspect-[2/3] overflow-hidden rounded-lg border-2 transition-all ${
                                            picked
                                                ? 'border-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]'
                                                : 'border-transparent group-hover:border-zinc-500 group-focus-visible:border-amber-300'
                                        }`}
                                    >
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w342${content.poster_path}`}
                                            alt=""
                                            fill
                                            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
                                            className={`object-cover transition-opacity ${picked ? 'opacity-60' : ''}`}
                                        />
                                        {picked && (
                                            <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                                                <CheckIcon className="h-4 w-4 stroke-[3]" />
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-1.5 block truncate text-xs text-gray-300 sm:text-sm">
                                        {title}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}

            {/* Always-visible progress and action */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#0b0b0d]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8 lg:px-16">
                    <p className="text-sm text-gray-300" aria-live="polite">
                        <HeartIcon className="mr-1.5 inline h-4 w-4 -translate-y-px text-amber-400" />
                        {pickedCount} picked
                        {remaining > 0 && (
                            <span className="text-gray-500">
                                {' '}
                                ·{' '}
                                {pickedCount < MIN_PICKS
                                    ? `${MIN_PICKS - pickedCount} more to go`
                                    : `up to ${remaining} more helps`}
                            </span>
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={onDone}
                        disabled={pickedCount < MIN_PICKS}
                        className="h-11 shrink-0 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                        Show my picks
                    </button>
                </div>
            </div>
        </div>
    )
}

function ForYouResults({
    liked,
    excludeKeys,
    onChangePicks,
    onQuota,
}: {
    liked: Content[]
    excludeKeys: string[]
    onChangePicks: () => void
    onQuota: (quota: ForYouResponse['quota']) => void
}) {
    const seeds = useMemo(
        () =>
            liked.slice(0, MAX_SEEDS).map((c) => ({
                id: c.id,
                media_type: c.media_type,
                title: getTitle(c),
            })),
        [liked]
    )
    const seedSignature = seeds.map((s) => `${s.media_type}-${s.id}`).join(',')
    const excludeRef = useRef(excludeKeys)
    excludeRef.current = excludeKeys

    const [data, setData] = useState<ForYouResponse | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [reloadCount, setReloadCount] = useState(0)

    useEffect(() => {
        if (seeds.length === 0) return
        const controller = new AbortController()
        setStatus('loading')
        fetch('/api/recommendations/for-you', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seeds, exclude: excludeRef.current }),
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(String(response.status))
                const body = (await response.json()) as ForYouResponse
                setData(body)
                setStatus('ready')
                if (body.quota) onQuota(body.quota)
            })
            .catch(() => {
                if (!controller.signal.aborted) setStatus('error')
            })
        return () => controller.abort()
        // seedSignature stands in for seeds; reloadCount re-runs on Refresh
    }, [seedSignature, reloadCount])

    if (seeds.length === 0) {
        return (
            <div className="py-16 text-center">
                <p className="text-gray-300">Pick a few titles you love to get started.</p>
                <button
                    type="button"
                    onClick={onChangePicks}
                    className="mt-4 h-11 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                >
                    Pick 5 you love
                </button>
            </div>
        )
    }

    const aiOk = data && (data.ai === 'ok' || data.ai === 'cached')

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                    <h1 className="text-[2rem] font-bold leading-10 text-white">For you</h1>
                    <p className="mt-1 text-gray-400">
                        Because you love {describeSeeds(seeds.map((s) => s.title))}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onChangePicks}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 hover:border-zinc-500 hover:text-white"
                    >
                        <PencilIcon className="h-4 w-4" />
                        Change picks
                    </button>
                    <button
                        type="button"
                        onClick={() => setReloadCount((n) => n + 1)}
                        disabled={status === 'loading'}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
                    >
                        <ArrowPathIcon
                            className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`}
                        />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="mt-3 min-h-5 space-y-1">
                {status === 'ready' && data?.notice && (
                    <p className="text-sm text-amber-200" role="status">
                        {data.notice}
                    </p>
                )}
                {status === 'ready' && aiOk && (
                    <p className="text-sm text-gray-400">Ranked by AI, with a reason for each.</p>
                )}
                <AiQuotaLine className="!text-gray-500" />
            </div>

            {status === 'loading' && (
                <ul
                    className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    aria-label="Loading picks"
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <li key={i}>
                            <div className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800" />
                            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                        </li>
                    ))}
                </ul>
            )}

            {status === 'error' && (
                <div className="py-16 text-center">
                    <p className="text-gray-300">Could not load your picks right now.</p>
                    <button
                        type="button"
                        onClick={() => setReloadCount((n) => n + 1)}
                        className="mt-4 h-11 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                    >
                        Try again
                    </button>
                </div>
            )}

            {status === 'ready' && data && data.picks.length === 0 && (
                <p className="py-16 text-center text-gray-400">
                    No new picks for these titles yet. Try changing your picks.
                </p>
            )}

            {status === 'ready' && data && data.picks.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-6 sm:gap-x-6 md:gap-x-8">
                    {data.picks.map((pick) => (
                        <li key={keyOf(pick.content)} className="flex flex-col">
                            <ContentCard content={pick.content} />
                            {/* w-0 + min-w-full: the reason wraps at the card's width */}
                            <p
                                className={`mt-1 w-0 min-w-full px-1 text-xs leading-snug sm:text-sm ${pick.reason ? 'text-amber-200/90' : 'text-gray-500'}`}
                            >
                                {pick.reason ?? `Similar to ${pick.becauseOf}`}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
