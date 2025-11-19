import React from 'react'
import { renderHook, act } from '@testing-library/react'
import useAuth, { AuthProvider } from '../../hooks/useAuth'

// Mock Firebase auth functions
const mockSignInWithEmailAndPassword = jest.fn()
const mockCreateUserWithEmailAndPassword = jest.fn()
const mockSignOut = jest.fn()
const mockSignInWithPopup = jest.fn()
const mockOnAuthStateChanged = jest.fn()

jest.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
    createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
    signOut: (...args: any[]) => mockSignOut(...args),
    signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
    onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
    GoogleAuthProvider: jest.fn().mockImplementation(() => ({
        addScope: jest.fn(),
    })),
    TwitterAuthProvider: jest.fn().mockImplementation(() => ({})),
    OAuthProvider: jest.fn().mockImplementation(() => ({
        addScope: jest.fn(),
    })),
}))

// Mock global fetch for password reset API calls
global.fetch = jest.fn()

// Test wrapper component (no longer needs RecoilRoot for Zustand)
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Mock successful auth state change
        mockOnAuthStateChanged.mockImplementation((auth, callback) => {
            // Simulate no user initially
            callback(null)
            return jest.fn() // unsubscribe function
        })
    })

    describe('Authentication Context', () => {
        it('should provide authentication context', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            expect(result.current).toHaveProperty('user')
            expect(result.current).toHaveProperty('loading')
            expect(result.current).toHaveProperty('signIn')
            expect(result.current).toHaveProperty('signUp')
            expect(result.current).toHaveProperty('signInWithGoogle')
            expect(result.current).toHaveProperty('logOut')
            expect(result.current).toHaveProperty('resetPass')
            expect(result.current).toHaveProperty('error')
        })

        it('should initialize with no user and loading false', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            expect(result.current.user).toBeNull()
            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
        })
    })

    describe('Sign In', () => {
        it('should handle successful email/password sign in', async () => {
            const mockUser = { uid: 'test-uid', email: 'test@example.com' }
            mockSignInWithEmailAndPassword.mockResolvedValueOnce({
                user: mockUser,
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.signIn('test@example.com', 'password123')
            })

            expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(), // auth object
                'test@example.com',
                'password123'
            )
        })

        it('should handle sign in errors', async () => {
            const authError = new Error('Invalid credentials') as Error & { code: string }
            authError.code = 'auth/invalid-credential'
            mockSignInWithEmailAndPassword.mockRejectedValueOnce(authError)

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.signIn('test@example.com', 'wrongpassword')
            })

            expect(mockSignInWithEmailAndPassword).toHaveBeenCalled()
            // Error handling is done through errorHandler, so we don't check result.current.error directly
        })
    })

    describe('Sign Up', () => {
        it('should handle successful email/password sign up', async () => {
            const mockUser = { uid: 'new-uid', email: 'new@example.com' }
            mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
                user: mockUser,
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.signUp('new@example.com', 'password123')
            })

            expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(), // auth object
                'new@example.com',
                'password123'
            )
        })

        it('should handle sign up errors', async () => {
            const authError = new Error('Email already in use') as Error & { code: string }
            authError.code = 'auth/email-already-in-use'
            mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(authError)

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.signUp('existing@example.com', 'password123')
            })

            expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled()
        })
    })

    describe('Social Authentication', () => {
        it('should handle Google sign in', async () => {
            const mockUser = { uid: 'google-uid', email: 'google@example.com' }
            const mockCredential = { accessToken: 'google-token' }
            mockSignInWithPopup.mockResolvedValueOnce({
                user: mockUser,
                credential: mockCredential,
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.signInWithGoogle()
            })

            expect(mockSignInWithPopup).toHaveBeenCalled()
        })
    })

    describe('Sign Out', () => {
        it('should handle successful sign out', async () => {
            mockSignOut.mockResolvedValueOnce(undefined)

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.logOut()
            })

            expect(mockSignOut).toHaveBeenCalled()
        })

        it('should handle sign out errors', async () => {
            const signOutError = new Error('Sign out failed')
            mockSignOut.mockRejectedValueOnce(signOutError)

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.logOut()
            })

            expect(mockSignOut).toHaveBeenCalled()
        })
    })

    describe('Password Reset', () => {
        it('should handle successful password reset', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Password reset email sent',
                    emailSent: true,
                }),
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.resetPass('test@example.com')
            })

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/auth/send-password-reset',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'test@example.com' }),
                })
            )
            expect(result.current.passResetSuccess).toBe(true)
        })

        it('should not show success state when API skips sending email', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'If an account exists, you will receive a password reset link.',
                    emailSent: false,
                }),
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.resetPass('oauth@example.com')
            })

            expect(global.fetch).toHaveBeenCalled()
            expect(result.current.passResetSuccess).toBe(false)
        })

        it('should handle password reset errors', async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'User not found' }),
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            await act(async () => {
                await result.current.resetPass('nonexistent@example.com')
            })

            expect(global.fetch).toHaveBeenCalled()
            expect(result.current.passResetSuccess).toBe(false)
        })
    })

    describe('Loading States', () => {
        it('should set loading to true during sign in', async () => {
            let resolveSignIn: (value: any) => void
            const signInPromise = new Promise((resolve) => {
                resolveSignIn = resolve
            })
            mockSignInWithEmailAndPassword.mockReturnValueOnce(signInPromise)

            const { result } = renderHook(() => useAuth(), {
                wrapper: TestWrapper,
            })

            act(() => {
                result.current.signIn('test@example.com', 'password123')
            })

            // Should be loading
            expect(result.current.loading).toBe(true)

            // Resolve the promise
            await act(async () => {
                resolveSignIn({ user: { uid: 'test-uid' } })
                await signInPromise
            })

            // Should no longer be loading
            expect(result.current.loading).toBe(false)
        })
    })
})
