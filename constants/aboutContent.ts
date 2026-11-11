/**
 * Copy for the "About this project" dialog (components/modals/AboutModal.tsx).
 * Kept here, next to tourSteps.ts, so the dialog is layout only.
 */

export const ABOUT_LINKS = {
    portfolio: 'https://portfolio.n8builds.dev',
    writeUp: 'https://portfolio.n8builds.dev/projects/net-trailers',
    source: 'https://github.com/n8watkins/net_trailers',
    n8builds: 'https://n8builds.dev',
} as const

export const ABOUT_SUMMARY =
    'Describe a mood and AI finds movies and shows to match. Watch the trailers, like what you love, keep lists. No account needed.'

export interface AboutStep {
    title: string
    body: string
    action: { label: string; href: string }
}

export const ABOUT_STEPS: AboutStep[] = [
    {
        title: 'Describe a mood',
        body: '"Cozy rainy-day mysteries" or "90s action with heart". AI turns it into a search.',
        action: { label: 'Try an example', href: '/smartsearch?example=cozy-rainy-day-mysteries' },
    },
    {
        title: 'Watch the trailer',
        body: 'Play one on any card or the big one at the top. Nothing to sign up for.',
        action: { label: 'Browse trailers', href: '/' },
    },
    {
        title: 'Like 5 titles',
        body: 'Pick a few you love and get For you picks, each with the reason it was chosen.',
        action: { label: 'Pick 5', href: '/recommendations' },
    },
    {
        title: 'Keep and share',
        body: 'Save collections, rank your top 10 and compare with the community.',
        action: { label: 'Collections', href: '/collections' },
    },
]

/** Key into the build-time NEXT_PUBLIC_STACK_VERSIONS map (lib/stackVersions.js). */
type VersionKey = 'next' | 'react' | 'typescript' | 'tailwind'

export interface StackChip {
    name: string
    /** Brand logo in /public/icons; chips without one are text only (no emoji stand-ins). */
    logo?: string
    version?: VersionKey
}

export const ABOUT_STACK: StackChip[] = [
    { name: 'Next.js', logo: '/icons/nextjs.svg', version: 'next' },
    { name: 'React', logo: '/icons/react.svg', version: 'react' },
    { name: 'TypeScript', logo: '/icons/typescript.svg', version: 'typescript' },
    { name: 'Tailwind', logo: '/icons/tailwind.svg', version: 'tailwind' },
    { name: 'Turso + Drizzle' },
    { name: 'Zustand' },
    { name: 'Auth.js' },
    { name: 'Gemini' },
    { name: 'TMDB' },
    { name: 'Cloudflare Workers' },
]

export interface AboutHighlight {
    id: string
    title: string
    bullets: [string, string, string]
}

export const ABOUT_HIGHLIGHTS: AboutHighlight[] = [
    {
        id: 'mood-search',
        title: 'AI mood search',
        bullets: [
            'Gemini turns a sentence into TMDB filters, answering in JSON only.',
            'The daily AI quota is refunded when a call fails.',
            'Voice input through the Web Speech API; example moods cost no quota.',
        ],
    },
    {
        id: 'recommendations',
        title: 'Recommendations with reasons',
        bullets: [
            'Ten interaction types, weighted from +5 to -5.',
            'Your top three genres from the last 90 days.',
            'A 7.0 minimum rating, and titles you have seen are left out.',
        ],
    },
    {
        id: 'server-side',
        title: 'Everything server-side',
        bullets: [
            '49 API routes proxy TMDB with caching and rate limiting.',
            'Turso is reached only through those routes; every write checks ownership.',
            'CSRF, CSP and HSTS are on by default.',
        ],
    },
    {
        id: 'trending-cron',
        title: 'Daily trending cron',
        bullets: [
            'A Worker snapshots the top 20 trending titles every day.',
            "It diffs the list against yesterday's.",
            'You get a notification when a title on your watchlist starts trending.',
        ],
    },
]

/** Build-time majors, e.g. { next: "16" }; empty when the build did not set them. */
export function readStackVersions(
    raw: string | undefined = process.env.NEXT_PUBLIC_STACK_VERSIONS
): Partial<Record<VersionKey, string>> {
    if (!raw) return {}
    try {
        const parsed: unknown = JSON.parse(raw)
        return parsed && typeof parsed === 'object'
            ? (parsed as Partial<Record<VersionKey, string>>)
            : {}
    } catch {
        return {}
    }
}
