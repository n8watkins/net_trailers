import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { GuestModeNotification } from '@/components/auth/GuestModeNotification'
import { LayoutProvider } from '@/contexts/LayoutContext'

const openAuthModal = jest.fn()
jest.mock('@/stores/modalStore', () => ({
    useModalStore: () => ({ openAuthModal }),
}))

describe('GuestModeNotification', () => {
    beforeEach(() => openAuthModal.mockClear())

    it('opens Help from the site layout when no handler is passed (Profile)', () => {
        const openHelp = jest.fn()
        render(
            <LayoutProvider value={{ onOpenTutorial: openHelp }}>
                <GuestModeNotification align="center" />
            </LayoutProvider>
        )
        fireEvent.click(screen.getByRole('button', { name: 'limitations' }))
        expect(openHelp).toHaveBeenCalledTimes(1)
    })

    it('prefers a handler passed in', () => {
        const fromLayout = jest.fn()
        const fromProp = jest.fn()
        render(
            <LayoutProvider value={{ onOpenTutorial: fromLayout }}>
                <GuestModeNotification onOpenTutorial={fromProp} />
            </LayoutProvider>
        )
        fireEvent.click(screen.getByRole('button', { name: 'limitations' }))
        expect(fromProp).toHaveBeenCalledTimes(1)
        expect(fromLayout).not.toHaveBeenCalled()
    })

    it('shows plain text, not a dead link, when there is no Help to open', () => {
        render(<GuestModeNotification />)
        expect(screen.queryByRole('button', { name: 'limitations' })).toBeNull()
        expect(screen.getByText(/limitations/)).toBeTruthy()
    })

    it('opens sign-up and sign-in', () => {
        render(<GuestModeNotification />)
        fireEvent.click(screen.getByRole('button', { name: 'create an account' }))
        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
        expect(openAuthModal.mock.calls).toEqual([['signup'], ['signin']])
    })
})
