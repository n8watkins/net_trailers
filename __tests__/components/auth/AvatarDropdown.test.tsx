import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AvatarDropdown from '@/components/auth/AvatarDropdown'

const auth = {
    user: null as null | { uid: string; email: string; displayName: string; photoURL: null },
    loading: false,
    logOut: jest.fn(),
}
const status = { hasOptimisticAuth: false }

jest.mock('@/hooks/useAuth', () => ({ __esModule: true, default: () => auth }))
jest.mock('@/hooks/useAuthStatus', () => ({ useAuthStatus: () => status }))
jest.mock('@/hooks/useUserData', () => ({ __esModule: true, default: () => ({}) }))
jest.mock('@/utils/authCache', () => ({ getCachedUserData: () => null }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('AvatarDropdown', () => {
    beforeEach(() => {
        auth.user = null
        auth.loading = false
        status.hasOptimisticAuth = false
    })

    it('gives a guest one Sign in control and one menu button', () => {
        const onOpenAuthModal = jest.fn()
        render(<AvatarDropdown onOpenAuthModal={onOpenAuthModal} />)
        expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(1)
        expect(screen.getAllByRole('button', { name: 'User menu' })).toHaveLength(1)

        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
        expect(onOpenAuthModal).toHaveBeenCalledTimes(1)
    })

    it('opens the guest menu from the menu button', () => {
        render(<AvatarDropdown />)
        fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
        expect(screen.getByText('Guest Account')).toBeTruthy()
    })

    it('shows a quiet placeholder, not a spinner, while the session is unknown', () => {
        auth.loading = true
        const { container } = render(<AvatarDropdown />)
        expect(screen.getByTestId('account-placeholder')).toBeTruthy()
        expect(container.querySelector('.animate-spin')).toBeNull()
        expect(screen.queryByRole('button')).toBeNull()
    })

    it('shows the profile menu as soon as the session has a user', () => {
        auth.user = { uid: 'u1', email: 'a@example.test', displayName: 'A', photoURL: null }
        render(<AvatarDropdown />)
        expect(screen.getByRole('button', { name: 'Profile menu' })).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
    })
})
