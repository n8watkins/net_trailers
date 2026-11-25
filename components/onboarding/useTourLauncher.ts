import { useCallback, useEffect, useRef, useState } from 'react'

/** The tour's steps point at the home page's search, rows and header. */
export const TOUR_HOME_PATH = '/'
/** The tour starts once the first row of posters is on the page. */
export const TOUR_READY_SELECTOR = '[data-tour="content-card"]'
/** Start anyway after this long; steps whose target is missing show centered. */
export const TOUR_READY_TIMEOUT_MS = 8000
/** Give up on a request that never reached the home page (navigation failed). */
export const TOUR_PENDING_TIMEOUT_MS = 20000

// Retired onboarding state (completion flags, tooltips, achievements) nothing read
const RETIRED_STORAGE_KEY = 'net_trailer_onboarding'

export type TourPhase = 'idle' | 'pending' | 'active'

function homeIsReady(): boolean {
    const card = document.querySelector(TOUR_READY_SELECTOR)
    if (!card) return false
    const rect = card.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
}

/**
 * Call `onReady` once the home page has its first poster (or after the timeout).
 * Watches the DOM only until then. Returns a cancel function.
 */
export function waitForTourAnchor(
    onReady: () => void,
    timeoutMs: number = TOUR_READY_TIMEOUT_MS
): () => void {
    let done = false
    let frame = 0
    const finish = () => {
        if (done) return
        done = true
        observer.disconnect()
        clearTimeout(timer)
        // One frame later, so the row has laid out before the tour measures it
        frame = requestAnimationFrame(() => onReady())
    }
    const observer = new MutationObserver(() => {
        if (homeIsReady()) finish()
    })
    const timer = setTimeout(finish, timeoutMs)
    observer.observe(document.body, { childList: true, subtree: true })
    if (homeIsReady()) finish()
    return () => {
        done = true
        observer.disconnect()
        clearTimeout(timer)
        cancelAnimationFrame(frame)
    }
}

/**
 * The one way to start the tour, held by ClientLayout so it survives the
 * windows that ask for it (Help & tutorial, About) closing and the route change.
 *
 * `startTour()` goes to the home page when the visitor is elsewhere and marks
 * the tour as pending; once the home page shows its first poster, the tour
 * becomes active. Leaving the home page while it runs ends it.
 */
export function useTourLauncher({
    pathname,
    navigate,
}: {
    pathname: string | null
    navigate: (href: string) => void
}) {
    const [phase, setPhase] = useState<TourPhase>('idle')
    const [runId, setRunId] = useState(0)
    const reachedHomeRef = useRef(false)

    // Drop the retired onboarding state left in this browser by earlier versions
    useEffect(() => {
        try {
            window.localStorage.removeItem(RETIRED_STORAGE_KEY)
        } catch {
            // Storage blocked (private mode, sandbox): nothing to clean
        }
    }, [])

    const startTour = useCallback(() => {
        reachedHomeRef.current = false
        setRunId((id) => id + 1)
        setPhase('pending')
        if (window.location.pathname !== TOUR_HOME_PATH) navigate(TOUR_HOME_PATH)
    }, [navigate])

    const endTour = useCallback(() => setPhase('idle'), [])

    // Pending: wait for the home page to have its posters, then start
    useEffect(() => {
        if (phase !== 'pending') return
        if (pathname !== TOUR_HOME_PATH) {
            // Left home after arriving (or never got there): drop the request
            if (reachedHomeRef.current) setPhase('idle')
            return
        }
        reachedHomeRef.current = true
        return waitForTourAnchor(() => setPhase('active'))
    }, [phase, pathname])

    // A request that never reaches the home page expires quietly
    useEffect(() => {
        if (phase !== 'pending') return
        const timer = setTimeout(() => setPhase('idle'), TOUR_PENDING_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [phase, runId])

    // Active: the steps only make sense on the home page
    useEffect(() => {
        if (phase === 'active' && pathname !== TOUR_HOME_PATH) setPhase('idle')
    }, [phase, pathname])

    return { phase, runId, startTour, endTour }
}
