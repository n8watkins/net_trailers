import { fireEvent, render, screen } from '@testing-library/react'
import AboutModal from '../../../components/modals/AboutModal'

function renderAbout(props: Partial<React.ComponentProps<typeof AboutModal>> = {}) {
    const onClose = jest.fn()
    const utils = render(<AboutModal isOpen onClose={onClose} {...props} />)
    return { onClose, ...utils }
}

describe('AboutModal', () => {
    it('renders nothing when closed', () => {
        render(<AboutModal isOpen={false} onClose={jest.fn()} />)
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('is a labelled modal dialog that takes focus', () => {
        renderAbout()
        const dialog = screen.getByRole('dialog', { name: /NetTrailers/ })
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(document.activeElement).toBe(dialog)
    })

    it('links the portfolio, write-up, source and n8builds.dev', () => {
        renderAbout()
        const href = (name: RegExp) => screen.getByRole('link', { name }).getAttribute('href')
        expect(href(/^Portfolio/)).toBe('https://portfolio.n8builds.dev')
        expect(href(/Project write-up/)).toBe(
            'https://portfolio.n8builds.dev/projects/net-trailers'
        )
        expect(href(/Source/)).toBe('https://github.com/n8watkins/net_trailers')
        expect(href(/n8builds\.dev/)).toBe('https://n8builds.dev')
        expect(href(/Security/)).toBe('/security')
        expect(href(/Changelog/)).toBe('/changelog')
        expect(href(/Pick 5/)).toBe('/recommendations')
        for (const link of screen.getAllByRole('link')) {
            expect(link.getAttribute('href')).not.toMatch(/net_trailer($|\/)/)
        }
    })

    it('closes on Escape and when an in-app link is followed', () => {
        const { onClose } = renderAbout()
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
        fireEvent.click(screen.getByRole('link', { name: /Try an example/ }))
        expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('traps Tab inside the dialog in both directions', () => {
        renderAbout({ onStartTour: jest.fn() })
        const close = screen.getByRole('button', { name: 'Close about' })
        const portfolio = screen.getByRole('link', { name: /^Portfolio/ })
        const last = screen.getByRole('link', { name: /n8builds\.dev/ })

        last.focus()
        fireEvent.keyDown(document, { key: 'Tab' })
        expect(document.activeElement).toBe(portfolio)

        portfolio.focus()
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(document.activeElement).toBe(last)

        // From the dialog itself (its first focus), Shift+Tab also wraps to the end
        screen.getByRole('dialog').focus()
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(document.activeElement).toBe(last)
        expect(close).toBeTruthy()
    })

    it('gives focus back to the opener when it closes', () => {
        const opener = document.createElement('button')
        document.body.appendChild(opener)
        opener.focus()
        const { rerender } = render(<AboutModal isOpen onClose={jest.fn()} />)
        expect(document.activeElement).not.toBe(opener)
        rerender(<AboutModal isOpen={false} onClose={jest.fn()} />)
        expect(document.activeElement).toBe(opener)
        opener.remove()
    })

    it('opens one highlight at a time', () => {
        renderAbout()
        const ai = screen.getByRole('button', { name: 'AI mood search' })
        const recs = screen.getByRole('button', { name: 'Recommendations with reasons' })
        expect(ai.getAttribute('aria-expanded')).toBe('false')
        fireEvent.click(ai)
        expect(ai.getAttribute('aria-expanded')).toBe('true')
        expect(screen.getByText(/Gemini turns a sentence/)).toBeTruthy()
        fireEvent.click(recs)
        expect(ai.getAttribute('aria-expanded')).toBe('false')
        expect(recs.getAttribute('aria-expanded')).toBe('true')
    })

    it('starts the tour from "Show me around" and hides it without a tour', () => {
        const onStartTour = jest.fn()
        const { onClose, unmount } = renderAbout({ onStartTour })
        fireEvent.click(screen.getByRole('button', { name: 'Show me around' }))
        expect(onClose).toHaveBeenCalled()
        expect(onStartTour).toHaveBeenCalled()
        unmount()
        renderAbout()
        expect(screen.queryByRole('button', { name: 'Show me around' })).toBeNull()
    })

    it('has no auto-cycling: nothing changes over time', () => {
        jest.useFakeTimers()
        renderAbout()
        const before = screen.getByRole('dialog').innerHTML
        jest.advanceTimersByTime(20_000)
        expect(screen.getByRole('dialog').innerHTML).toBe(before)
        jest.useRealTimers()
    })
})
