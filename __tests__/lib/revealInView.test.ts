import {
    HIGHLIGHT_MS,
    highlightBriefly,
    isFullyVisible,
    revealAndFocus,
} from '../../lib/revealInView'

const area = { top: 96, bottom: 900 }

function boxAt(top: number, height = 70) {
    const el = document.createElement('textarea')
    document.body.appendChild(el)
    el.getBoundingClientRect = () => ({ top, bottom: top + height }) as DOMRect
    el.scrollIntoView = jest.fn()
    jest.spyOn(el, 'focus')
    return el
}

afterEach(() => {
    document.body.innerHTML = ''
})

describe('isFullyVisible', () => {
    it('needs the whole box between the header and the viewport bottom', () => {
        expect(isFullyVisible({ top: 561, bottom: 634 }, area)).toBe(true)
        expect(isFullyVisible({ top: 80, bottom: 150 }, area)).toBe(false) // under the header
        expect(isFullyVisible({ top: 860, bottom: 930 }, area)).toBe(false) // below the fold
    })
})

describe('revealAndFocus', () => {
    it('does not scroll when the box is already fully visible, and focuses without scrolling', () => {
        const box = boxAt(561)
        expect(revealAndFocus(box, box, area)).toBe(false)
        expect(box.scrollIntoView).not.toHaveBeenCalled()
        expect(box.focus).toHaveBeenCalledWith({ preventScroll: true })
    })

    it('scrolls to the nearest edge, clear of the header, when it is cut off', () => {
        const box = boxAt(860)
        expect(revealAndFocus(box, box, area)).toBe(true)
        expect(box.scrollIntoView).toHaveBeenCalledWith(
            expect.objectContaining({ block: 'nearest' })
        )
        expect(box.style.scrollMarginTop).toBe('112px')
        expect(box.focus).toHaveBeenCalledWith({ preventScroll: true })
    })

    it('scrolls when the box hides under the sticky header', () => {
        const box = boxAt(60)
        expect(revealAndFocus(box, box, area)).toBe(true)
    })
})

describe('highlightBriefly', () => {
    it('rings the box and shows the example for 1.5s, then restores the placeholder', () => {
        jest.useFakeTimers()
        const ring = document.createElement('div')
        const input = document.createElement('textarea')
        input.setAttribute('placeholder', 'Describe a mood')
        highlightBriefly(ring, input, 'e.g. "Cozy rainy-day mysteries"')
        expect(ring.hasAttribute('data-attention')).toBe(true)
        expect(input.getAttribute('placeholder')).toBe('e.g. "Cozy rainy-day mysteries"')
        jest.advanceTimersByTime(HIGHLIGHT_MS)
        expect(ring.hasAttribute('data-attention')).toBe(false)
        expect(input.getAttribute('placeholder')).toBe('Describe a mood')
        jest.useRealTimers()
    })
})
