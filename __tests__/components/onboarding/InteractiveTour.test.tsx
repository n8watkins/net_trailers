import { act, fireEvent, render, screen } from '@testing-library/react'
import InteractiveTour from '../../../components/onboarding/InteractiveTour'

jest.mock('../../../hooks/useAuthStatus', () => ({
    useAuthStatus: () => ({ isGuest: true, isAuthenticated: false }),
}))

function renderTour() {
    const onComplete = jest.fn()
    const onSkip = jest.fn()
    render(<InteractiveTour onComplete={onComplete} onSkip={onSkip} />)
    return { onComplete, onSkip, card: () => screen.getByTestId('tour-card') }
}

describe('InteractiveTour', () => {
    it('opens with focus on Next inside a labelled dialog', () => {
        const { card } = renderTour()
        expect(card().getAttribute('role')).toBe('dialog')
        expect(screen.getByRole('heading', { name: /Welcome to NetTrailers/ })).toBeTruthy()
        expect(screen.getByTestId('tour-welcome-mark').getAttribute('src')).toContain(
            'nettrailers-mark'
        )
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next/ }))
    })

    it('shows a step whose target is missing as a centered card, never off-screen', () => {
        const { card } = renderTour()
        // Quick Search: no search box or search button on this page
        fireEvent.click(screen.getByRole('button', { name: /Next/ }))
        expect(screen.getByRole('heading', { name: /Quick Search/ })).toBeTruthy()
        expect(card().getAttribute('data-placement')).toBe('centered')
        expect(card().style.position).toBe('')
        expect(screen.queryByTestId('tour-spotlight')).toBeNull()
    })

    it('moves with the arrow keys, skips on Escape, and leaves Enter to the focused button', () => {
        const { onSkip } = renderTour()
        fireEvent.keyDown(document, { key: 'ArrowRight' })
        expect(screen.getByRole('heading', { name: /Quick Search/ })).toBeTruthy()
        fireEvent.keyDown(document, { key: 'ArrowLeft' })
        expect(screen.getByRole('heading', { name: /Welcome/ })).toBeTruthy()

        // Enter on the document no longer advances by itself
        fireEvent.keyDown(document, { key: 'Enter' })
        expect(screen.getByRole('heading', { name: /Welcome/ })).toBeTruthy()

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it('finishes on the last step and locks page scrolling while open', () => {
        const { onComplete } = renderTour()
        expect(document.body.style.overflow).toBe('hidden')
        for (let i = 0; i < 9; i++) {
            act(() => {
                fireEvent.click(screen.getByRole('button', { name: /Next/ }))
            })
        }
        fireEvent.click(screen.getByRole('button', { name: /Finish/ }))
        expect(onComplete).toHaveBeenCalledTimes(1)
    })
})
