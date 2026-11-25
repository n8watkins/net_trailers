/**
 * Pure geometry and DOM lookups for the interactive tour, kept apart from the
 * component so they can be unit tested.
 */

/** Space kept between the card and the screen edges. */
export const TOUR_GUTTER = 16
/** Space between the highlighted element and the card. */
export const TOUR_GAP = 16
/** Widest the card gets next to a highlighted element. */
export const TOUR_CARD_MAX_WIDTH = 448
/** Below this width the card docks to the top or bottom edge like a sheet. */
export const TOUR_SHEET_BREAKPOINT = 640
export const DEFAULT_SPOTLIGHT_PADDING = 8

export interface Box {
    top: number
    left: number
    width: number
    height: number
}

export interface TourLayout {
    /** The highlight box, or null for a centered step. */
    spotlight: Box | null
    /** Where the card sits, or null to center it. */
    card: { top: number; left: number; width: number } | null
}

/**
 * True when the element takes up space on screen and is not hidden, so the
 * spotlight never lands on a collapsed search box or an invisible menu.
 */
export function isUsableTarget(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement) || !el.isConnected) return false
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    if (typeof el.checkVisibility === 'function') {
        return el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    }
    return true
}

/** The first visible element matching the selectors, in their order of preference. */
export function findTourTarget(
    selectors: string[],
    root: ParentNode = document
): HTMLElement | null {
    for (const selector of selectors) {
        let matches: NodeListOf<Element>
        try {
            matches = root.querySelectorAll(selector)
        } catch {
            continue
        }
        for (const el of Array.from(matches)) {
            if (isUsableTarget(el)) return el
        }
    }
    return null
}

function overlaps(aTop: number, aBottom: number, bTop: number, bBottom: number): boolean {
    return aTop < bBottom && bTop < aBottom
}

/**
 * Place the spotlight and the card for one step.
 *
 * - No target: centered card, no spotlight.
 * - Narrow screens: the card spans the width minus the gutters and docks to the
 *   bottom edge, or the top edge when the bottom would cover the target.
 * - Wide screens: the card sits above or below the target as the step asks,
 *   flips when only the other side has room, goes beside a target too tall for
 *   either, and is always clamped inside the gutters.
 */
export function computeTourLayout(params: {
    target: Box | null
    cardHeight: number
    viewport: { width: number; height: number }
    position: 'top' | 'bottom' | 'center'
    spotlightPadding?: number
}): TourLayout {
    const { target, cardHeight, viewport, position } = params
    if (!target || position === 'center') return { spotlight: null, card: null }

    const pad = params.spotlightPadding ?? DEFAULT_SPOTLIGHT_PADDING
    const spotlight: Box = {
        top: target.top - pad,
        left: target.left - pad,
        width: target.width + pad * 2,
        height: target.height + pad * 2,
    }
    const spotTop = spotlight.top
    const spotBottom = spotlight.top + spotlight.height
    const maxTop = Math.max(TOUR_GUTTER, viewport.height - TOUR_GUTTER - cardHeight)

    if (viewport.width < TOUR_SHEET_BREAKPOINT) {
        const width = viewport.width - TOUR_GUTTER * 2
        const bottomTop = maxTop
        const top = overlaps(bottomTop, bottomTop + cardHeight, spotTop, spotBottom)
            ? !overlaps(TOUR_GUTTER, TOUR_GUTTER + cardHeight, spotTop, spotBottom)
                ? TOUR_GUTTER
                : bottomTop
            : bottomTop
        return { spotlight, card: { top, left: TOUR_GUTTER, width } }
    }

    const width = Math.min(TOUR_CARD_MAX_WIDTH, viewport.width - TOUR_GUTTER * 2)
    const clampTop = (value: number) => Math.min(Math.max(value, TOUR_GUTTER), maxTop)
    const clampLeft = (value: number) =>
        Math.min(
            Math.max(value, TOUR_GUTTER),
            Math.max(TOUR_GUTTER, viewport.width - TOUR_GUTTER - width)
        )
    const roomAbove = spotTop - TOUR_GAP - TOUR_GUTTER
    const roomBelow = viewport.height - TOUR_GUTTER - (spotBottom + TOUR_GAP)
    const preferred = position === 'top' ? roomAbove : roomBelow
    const other = position === 'top' ? roomBelow : roomAbove

    // Above or below, as the step asks, or flipped when only the other side has room
    if (preferred >= cardHeight || other >= cardHeight) {
        const side = preferred >= cardHeight ? position : position === 'top' ? 'bottom' : 'top'
        const rawTop = side === 'top' ? spotTop - TOUR_GAP - cardHeight : spotBottom + TOUR_GAP
        const rawLeft = target.left + target.width / 2 - width / 2
        return { spotlight, card: { top: clampTop(rawTop), left: clampLeft(rawLeft), width } }
    }

    // A tall target: beside it, on whichever side has room, level with its middle
    const spotRight = spotlight.left + spotlight.width
    const roomRight = viewport.width - TOUR_GUTTER - (spotRight + TOUR_GAP)
    const roomLeft = spotlight.left - TOUR_GAP - TOUR_GUTTER
    if (roomRight >= width || roomLeft >= width) {
        const rawLeft =
            roomRight >= width ? spotRight + TOUR_GAP : spotlight.left - TOUR_GAP - width
        const rawTop = spotTop + spotlight.height / 2 - cardHeight / 2
        return { spotlight, card: { top: clampTop(rawTop), left: clampLeft(rawLeft), width } }
    }

    // No room anywhere: the side with more space, kept on screen
    const side = roomBelow >= roomAbove ? 'bottom' : 'top'
    const rawTop = side === 'top' ? spotTop - TOUR_GAP - cardHeight : spotBottom + TOUR_GAP
    const rawLeft = target.left + target.width / 2 - width / 2
    return { spotlight, card: { top: clampTop(rawTop), left: clampLeft(rawLeft), width } }
}

/** True when two layouts would draw the same pixels (avoids a re-render per frame). */
export function sameLayout(a: TourLayout, b: TourLayout): boolean {
    const near = (x: number, y: number) => Math.abs(x - y) < 0.5
    const sameBox = (p: Box | null, q: Box | null) =>
        p === q ||
        (!!p &&
            !!q &&
            near(p.top, q.top) &&
            near(p.left, q.left) &&
            near(p.width, q.width) &&
            near(p.height, q.height))
    const sameCard = (p: TourLayout['card'], q: TourLayout['card']) =>
        p === q ||
        (!!p && !!q && near(p.top, q.top) && near(p.left, q.left) && near(p.width, q.width))
    return sameBox(a.spotlight, b.spotlight) && sameCard(a.card, b.card)
}

/**
 * Bring the target into view once per step: centered on wide screens, near the
 * top on narrow ones (the card docks below it). Does nothing when it is already
 * fully visible.
 */
export function revealTourTarget(el: HTMLElement): void {
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const narrow = window.innerWidth < TOUR_SHEET_BREAKPOINT
    // Below the fixed header, and on phones in the upper half so the docked card fits
    const visibleTop = 72
    const visibleBottom = narrow ? vh * 0.55 : vh - TOUR_GUTTER
    if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return

    const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previousMargin = el.style.scrollMarginTop
    if (narrow) el.style.scrollMarginTop = `${visibleTop + TOUR_GUTTER}px`
    el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: narrow ? 'start' : 'center',
        inline: 'nearest',
    })
    el.style.scrollMarginTop = previousMargin
}
