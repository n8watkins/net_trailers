import {
    computeTourLayout,
    findTourTarget,
    sameLayout,
    TOUR_GUTTER,
} from '../../../components/onboarding/tourLayout'

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

function within(card: { top: number; left: number; width: number }, height: number, vp = DESKTOP) {
    expect(card.left).toBeGreaterThanOrEqual(TOUR_GUTTER)
    expect(card.top).toBeGreaterThanOrEqual(TOUR_GUTTER)
    expect(card.left + card.width).toBeLessThanOrEqual(vp.width - TOUR_GUTTER)
    expect(card.top + height).toBeLessThanOrEqual(vp.height - TOUR_GUTTER)
}

function apart(
    card: { top: number; left: number; width: number },
    height: number,
    spot: { top: number; left: number; width: number; height: number }
) {
    return (
        card.top >= spot.top + spot.height ||
        card.top + height <= spot.top ||
        card.left >= spot.left + spot.width ||
        card.left + card.width <= spot.left
    )
}

describe('computeTourLayout', () => {
    it('centers the card when there is no target or the step is centered', () => {
        expect(
            computeTourLayout({
                target: null,
                cardHeight: 300,
                viewport: DESKTOP,
                position: 'bottom',
            })
        ).toEqual({ spotlight: null, card: null })
        expect(
            computeTourLayout({
                target: { top: 10, left: 10, width: 50, height: 50 },
                cardHeight: 300,
                viewport: DESKTOP,
                position: 'center',
            })
        ).toEqual({ spotlight: null, card: null })
    })

    it('puts the card below a header element and pads the spotlight', () => {
        const target = { top: 40, left: 480, width: 460, height: 46 }
        const { spotlight, card } = computeTourLayout({
            target,
            cardHeight: 300,
            viewport: DESKTOP,
            position: 'bottom',
            spotlightPadding: 12,
        })
        expect(spotlight).toEqual({ top: 28, left: 468, width: 484, height: 70 })
        expect(card!.top).toBeGreaterThan(spotlight!.top + spotlight!.height)
        within(card!, 300)
    })

    it('flips a "top" card below when there is no room above', () => {
        const target = { top: 120, left: 60, width: 220, height: 200 }
        const { spotlight, card } = computeTourLayout({
            target,
            cardHeight: 300,
            viewport: DESKTOP,
            position: 'top',
        })
        expect(card!.top).toBeGreaterThanOrEqual(spotlight!.top + spotlight!.height)
        within(card!, 300)
    })

    it('goes beside a target too tall to fit above or below (desktop content card)', () => {
        const target = { top: 240, left: 64, width: 220, height: 330 }
        const { spotlight, card } = computeTourLayout({
            target,
            cardHeight: 330,
            viewport: DESKTOP,
            position: 'top',
            spotlightPadding: 12,
        })
        within(card!, 330)
        expect(apart(card!, 330, spotlight!)).toBe(true)
        expect(card!.left).toBeGreaterThan(spotlight!.left + spotlight!.width)
    })

    it('docks as a sheet inside the 16 px gutter on phones', () => {
        // A header button at the top: the sheet sits at the bottom
        const top = computeTourLayout({
            target: { top: 10, left: 250, width: 44, height: 44 },
            cardHeight: 280,
            viewport: PHONE,
            position: 'bottom',
        })
        expect(top.card).toEqual({ top: 844 - 16 - 280, left: 16, width: 390 - 32 })

        // A target low on the screen: the sheet moves to the top
        const low = computeTourLayout({
            target: { top: 600, left: 20, width: 160, height: 200 },
            cardHeight: 280,
            viewport: PHONE,
            position: 'top',
        })
        expect(low.card!.top).toBe(16)
        within(low.card!, 280, PHONE)
        expect(apart(low.card!, 280, low.spotlight!)).toBe(true)
    })

    it('never puts the card past the right edge on a narrow viewport', () => {
        const { card } = computeTourLayout({
            target: { top: 20, left: 600, width: 40, height: 40 },
            cardHeight: 250,
            viewport: { width: 700, height: 800 },
            position: 'bottom',
        })
        within(card!, 250, { width: 700, height: 800 })
    })
})

describe('sameLayout', () => {
    it('ignores sub-pixel jitter and sees real moves', () => {
        const a = {
            spotlight: { top: 1, left: 1, width: 10, height: 10 },
            card: { top: 50, left: 1, width: 300 },
        }
        expect(sameLayout(a, { ...a, card: { ...a.card, top: 50.2 } })).toBe(true)
        expect(sameLayout(a, { ...a, card: { ...a.card, top: 52 } })).toBe(false)
        expect(sameLayout(a, { spotlight: null, card: null })).toBe(false)
    })
})

describe('findTourTarget', () => {
    function box(el: HTMLElement, width: number, height: number) {
        el.getBoundingClientRect = () =>
            ({ top: 0, left: 0, width, height, right: width, bottom: height }) as DOMRect
    }

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('skips zero-size and hidden matches and falls through to the next selector', () => {
        document.body.innerHTML = `
            <input id="collapsed" />
            <button id="hidden" class="b"></button>
            <button id="shown" class="b"></button>`
        box(document.getElementById('collapsed')!, 0, 0)
        const hidden = document.getElementById('hidden')!
        box(hidden, 40, 40)
        hidden.checkVisibility = () => false
        box(document.getElementById('shown')!, 40, 40)

        expect(findTourTarget(['#collapsed', '.b'])?.id).toBe('shown')
    })

    it('returns null when nothing usable matches, and survives a bad selector', () => {
        document.body.innerHTML = '<div id="a"></div>'
        box(document.getElementById('a')!, 0, 0)
        expect(findTourTarget(['#a', '::not-a-selector(', '#missing'])).toBeNull()
    })
})
