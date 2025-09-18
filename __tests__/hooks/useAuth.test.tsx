import React from 'react'
import { render, renderHook, act, waitFor } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import useAuth, { AuthProvider } from '../../hooks/useAuth'

// Mock Firebase auth functions
const mockSignInWithEmailAndPassword = jest.fn()
const mockCreateUserWithEmailAndPassword = jest.fn()
const mockSignOut = jest.fn()
const mockSendPasswordResetEmail = jest.fn()
const mockSignInWithPopup = jest.fn()
const mockOnAuthStateChanged = jest.fn()

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RecoilRoot>
    <AuthProvider>
      {children}
    </AuthProvider>
  </RecoilRoot>
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
      expect(result.current).toHaveProperty('signInWithDiscord')
      expect(result.current).toHaveProperty('signInWithTwitter')
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
      const authError = new Error('Invalid credentials')
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
      const authError = new Error('Email already in use')
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

    it('should handle Twitter sign in', async () => {
      const mockUser = { uid: 'twitter-uid', email: 'twitter@example.com' }
      mockSignInWithPopup.mockResolvedValueOnce({
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      })

      await act(async () => {
        await result.current.signInWithTwitter()
      })

      expect(mockSignInWithPopup).toHaveBeenCalled()
    })

    it('should handle Discord sign in', async () => {
      const mockUser = { uid: 'discord-uid', email: 'discord@example.com' }
      mockSignInWithPopup.mockResolvedValueOnce({
        user: mockUser,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      })

      await act(async () => {
        await result.current.signInWithDiscord()
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
      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      })

      await act(async () => {
        await result.current.resetPass('test@example.com')
      })

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(), // auth object
        'test@example.com'
      )
      expect(result.current.passResetSuccess).toBe(true)
    })

    it('should handle password reset errors', async () => {
      const resetError = new Error('User not found')
      resetError.code = 'auth/user-not-found'
      mockSendPasswordResetEmail.mockRejectedValueOnce(resetError)

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      })

      await act(async () => {
        await result.current.resetPass('nonexistent@example.com')
      })

      expect(mockSendPasswordResetEmail).toHaveBeenCalled()
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