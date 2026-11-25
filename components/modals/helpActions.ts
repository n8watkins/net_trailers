import { HIGHLIGHT_MS, highlightBriefly, revealAndFocus } from '../../lib/revealInView'
import type { Content } from '../../typings'

/**
 * What the Help window's "Open" link does for features that have no page of
 * their own: search lives in the header, mood and voice search in the mood box
 * on the home page, and Surprise me opens a random title. Each runs after the
 * window has closed.
 */

const MOOD_BOX = '#mood-search'
const MOOD_INPUT = `${MOOD_BOX} textarea`
const MOOD_MIC = `${MOOD_BOX} button[aria-label="Start voice input"]`
const DESKTOP_SEARCH = 'navbar-search-input'
const PHONE_SEARCH = 'navbar-mobile-search-input'
/** The header's phone search toggle (components/layout/Header.tsx) */
const PHONE_SEARCH_TOGGLE = 'header button[aria-label="Search"]'

const RETRY_MS = 100
const MAX_TRIES = 40

function isShown(el: Element | null): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false
    if (typeof el.checkVisibility === 'function') {
        return el.checkVisibility({ checkVisibilityCSS: true } as CheckVisibilityOptions)
    }
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
}

/** Call `find` every 100 ms until it returns something (up to 4 s), then `use` it. */
function whenFound<T>(find: () => T | null, use: (found: T) => void): void {
    let tries = 0
    const attempt = () => {
        const found = find()
        if (found) use(found)
        else if (tries++ < MAX_TRIES) window.setTimeout(attempt, RETRY_MS)
    }
    attempt()
}

/**
 * Focus the header search field. On wide screens it is always there; on phones
 * it sits behind the header's search button, which is pressed first.
 */
export function focusHeaderSearch(): void {
    const desktop = document.getElementById(DESKTOP_SEARCH)
    if (isShown(desktop)) {
        desktop.focus()
        return
    }
    const phone = document.getElementById(PHONE_SEARCH)
    if (!isShown(phone)) document.querySelector<HTMLButtonElement>(PHONE_SEARCH_TOGGLE)?.click()
    whenFound(
        () => {
            const input = document.getElementById(PHONE_SEARCH)
            return isShown(input) ? input : null
        },
        (input) => input.focus()
    )
}

/** Go home (if elsewhere) and focus the mood box with a short red ring and an example. */
export function focusMoodBox(pathname: string | null, navigate: (href: string) => void): void {
    if (pathname !== '/') navigate('/')
    whenFound(
        () => document.querySelector<HTMLTextAreaElement>(MOOD_INPUT),
        (box) => {
            const container = box.parentElement ?? box
            revealAndFocus(container, box)
            highlightBriefly(container, box, 'e.g. "Cozy rainy-day mysteries"')
        }
    )
}

/**
 * Go home and point at the mood box's microphone (focus and a short ring)
 * without starting it: listening needs the visitor's own tap and permission.
 * Browsers without speech input show no microphone, so the box itself is
 * focused instead.
 */
export function pointAtMoodMic(pathname: string | null, navigate: (href: string) => void): void {
    if (pathname !== '/') navigate('/')
    whenFound(
        () => document.querySelector<HTMLTextAreaElement>(MOOD_INPUT),
        (box) => {
            const container = box.parentElement ?? box
            // The microphone renders once the browser's support is known (after mount)
            window.setTimeout(() => {
                const mic = document.querySelector<HTMLButtonElement>(MOOD_MIC)
                if (!isShown(mic)) {
                    revealAndFocus(container, box)
                    return
                }
                revealAndFocus(container, mic)
                mic.setAttribute('data-attention', '')
                window.setTimeout(() => mic.removeAttribute('data-attention'), HIGHLIGHT_MS)
            }, RETRY_MS)
        }
    )
}

/**
 * Open a random movie or show, the way the header's Surprise me does
 * (components/layout/Header.tsx), from the same endpoint.
 */
export async function openRandomTitle(
    childSafetyMode: boolean,
    openModal: (content: Content, autoPlay?: boolean, autoPlayWithSound?: boolean) => void,
    onError: () => void
): Promise<void> {
    try {
        const response = await fetch(
            `/api/random-content?childSafetyMode=${childSafetyMode ? 'true' : 'false'}`,
            { cache: 'no-store' }
        )
        if (!response.ok) throw new Error(`Random content request failed: ${response.status}`)
        const data = await response.json()
        const content = data?.content as Content | undefined
        if (!content?.id) throw new Error('Random content payload missing')
        openModal(
            { ...content, media_type: content.media_type === 'tv' ? 'tv' : 'movie' } as Content,
            true,
            false
        )
    } catch {
        onError()
    }
}
