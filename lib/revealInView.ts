/**
 * Bring an element into view only when it is not already fully visible
 * between the sticky header and the bottom of the viewport, then focus and
 * briefly highlight it. Used by the welcome's "Describe a mood", where an
 * unconditional scrollIntoView used to jump the page and clip the hero title.
 */

/** Gap kept between the sticky header and the element after a scroll. */
const HEADER_GAP = 16
export const HIGHLIGHT_MS = 1500

export interface VisibleArea {
    /** Bottom edge of the sticky header, in viewport pixels (0 when there is none). */
    top: number
    /** Viewport height. */
    bottom: number
}

/** True when `rect` sits entirely inside the visible area. */
export function isFullyVisible(rect: Pick<DOMRect, 'top' | 'bottom'>, area: VisibleArea): boolean {
    return rect.top >= area.top && rect.bottom <= area.bottom
}

/** The area below the fixed site header (`header` element) and above the viewport bottom. */
export function visibleAreaBelowHeader(doc: Document = document): VisibleArea {
    const header = doc.querySelector('header')
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
    return { top, bottom: doc.defaultView?.innerHeight ?? doc.documentElement.clientHeight }
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
}

/**
 * Scroll `el` into view only if needed (block 'nearest', clear of the header),
 * focus `focusEl` without scrolling, and return whether a scroll was requested.
 */
export function revealAndFocus(
    el: HTMLElement,
    focusEl: HTMLElement = el,
    area: VisibleArea = visibleAreaBelowHeader()
): boolean {
    const rect = el.getBoundingClientRect()
    const needsScroll = !isFullyVisible(rect, area)
    if (needsScroll) {
        el.style.scrollMarginTop = `${area.top + HEADER_GAP}px`
        el.scrollIntoView({
            block: 'nearest',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
    }
    focusEl.focus({ preventScroll: true })
    return needsScroll
}

/**
 * Show an amber ring on `ring` and an example in `input`'s placeholder for
 * HIGHLIGHT_MS, then put the placeholder back.
 */
export function highlightBriefly(
    ring: HTMLElement,
    input: HTMLTextAreaElement | HTMLInputElement,
    example: string
): void {
    const placeholder = input.getAttribute('placeholder')
    ring.setAttribute('data-attention', '')
    input.setAttribute('placeholder', example)
    window.setTimeout(() => {
        ring.removeAttribute('data-attention')
        // Leave it alone if React changed it meanwhile (e.g. the phone breakpoint flipped)
        if (input.getAttribute('placeholder') === example) {
            if (placeholder === null) input.removeAttribute('placeholder')
            else input.setAttribute('placeholder', placeholder)
        }
    }, HIGHLIGHT_MS)
}
