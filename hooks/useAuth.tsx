import React, {
    useState,
    useContext,
    createContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react'

import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    User,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth'

import { auth } from '../firebase'
import { useAppStore } from '../stores/appStore'
import { createErrorHandler } from '../utils/errorHandler'
import { useToast } from './useToast'
import { cacheAuthState, clearAuthCache, wasRecentlyAuthenticated } from '../utils/authCache'
import { authLog, authError } from '../utils/debugLogger'
import { authenticatedFetch } from '../lib/authenticatedFetch'

interface AuthProviderProps {
    children: React.ReactNode
}

interface iAuth {
    user: User | null
    loading: boolean
    wasRecentlyAuthenticated: boolean // Optimistic auth check (synchronous)
    signUp: (email: string, password: string) => Promise<void>
    signIn: (email: string, password: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    logOut: () => Promise<void>
    error: string | null
    resetPass: (email: string) => Promise<void>
    passResetSuccess: boolean
    attemptPassReset: boolean
    setAttemptPassReset: (value: boolean) => void
    sendVerificationEmail: () => Promise<void>
}

export const AuthContext = createContext<iAuth>({
    user: null,
    loading: false,
    wasRecentlyAuthenticated: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    signUp: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    signIn: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    signInWithGoogle: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logOut: async () => {},
    error: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    resetPass: async () => {},
    passResetSuccess: false,
    attemptPassReset: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setAttemptPassReset: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendVerificationEmail: async () => {},
})

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true) // Start with loading true until auth state is known
    const [authInitialized, setAuthInitialized] = useState(false)
    const [passResetSuccess, setPassResetSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [attemptPassReset, setAttemptPassReset] = useState(false)
    const setGlobalLoading = useAppStore((state) => state.setLoading)
    const { showSuccess, showError } = useToast()
    const errorHandler = createErrorHandler(showError)

    // Check if user was recently authenticated (optimistic check)
    // Must use state to avoid hydration mismatch (localStorage only on client)
    const [wasRecentlyAuth, setWasRecentlyAuth] = useState(false)

    // Track component mount state to prevent memory leaks from state updates after unmount
    const isMountedRef = useRef(true)

    // Check cache BEFORE first paint using useLayoutEffect (synchronous, no flash)
    // This runs after DOM update but before browser paint, so user never sees the flash
    useLayoutEffect(() => {
        setWasRecentlyAuth(wasRecentlyAuthenticated())
    }, [])

    useEffect(() => {
        const startTime = Date.now()
        authLog('🔥 [AUTH-TIMING] Firebase Auth Hook Initializing at:', new Date().toISOString())
        authLog('🔥 Firebase Auth Instance:', auth)
        authLog('🔥 Firebase Config:', {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Missing',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
        })

        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                // Prevent state updates after component unmount (memory leak prevention)
                if (!isMountedRef.current) return

                const callbackTime = Date.now() - startTime
                authLog(
                    '🔥🔥🔥 [AUTH-TIMING] Firebase onAuthStateChanged fired after',
                    callbackTime,
                    'ms'
                )
                authLog('🔥 User:', user)
                authLog('🔥 User ID:', user?.uid)
                authLog('🔥 User Email:', user?.email)
                authLog('🔥 Auth Initialized Before:', authInitialized)
                authLog('🔥 Loading State Before:', loading)

                setUser(user)
                setLoading(false)
                setAuthInitialized(true)

                authLog(
                    '🔥 [AUTH-TIMING] Auth state set, user is:',
                    user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'
                )

                // Cache auth state for optimistic loading on next visit
                if (user) {
                    cacheAuthState(user.uid, {
                        email: user.email || undefined,
                        displayName: user.displayName || undefined,
                        photoURL: user.photoURL || undefined,
                    })
                    authLog('✅ User is authenticated:', user.email)
                } else {
                    // Clear cache when user signs out
                    clearAuthCache()
                    authLog('🎭 User signed out or not authenticated')
                }
            },
            (error) => {
                // Prevent state updates after component unmount (memory leak prevention)
                if (!isMountedRef.current) return

                authError('🚨 Firebase Auth Error:', error)
                setLoading(false)
                setAuthInitialized(true)
            }
        )

        return () => {
            // Mark component as unmounted to prevent state updates after cleanup
            isMountedRef.current = false
            unsubscribe()
        }
    }, [])

    const sendVerificationEmail = async () => {
        const currentUser = auth.currentUser

        if (!currentUser?.email) {
            showError('No authenticated user found.')
            return
        }

        try {
            const response = await authenticatedFetch('/api/auth/send-email-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send verification email')
            }

            showSuccess('Verification email sent! Check your inbox to confirm your address.')
        } catch (error) {
            console.error('Failed to send verification email:', error)
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to send verification email. Please try again.'
            showError(message)
            setError(message)
        }
    }

    const signUp = async (email: string, password: string) => {
        setLoading(true)
        setGlobalLoading(true)
        await createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'there'
                showSuccess(`Welcome ${displayName}! Account created successfully.`)

                // Trigger verification email for new accounts
                await sendVerificationEmail()

                // Record account creation in system stats
                try {
                    await fetch('/api/auth/record-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.uid,
                            email: user.email,
                        }),
                    })
                } catch (error) {
                    console.error('Failed to record account creation:', error)
                    // Don't fail the signup if stats recording fails
                }

                // Don't redirect - stay on current page
                setLoading(false)
            })
            .catch((error) => {
                errorHandler.handleAuthError(error)
                setError(error.message)
            })
            .finally(() => {
                setLoading(false)
                setGlobalLoading(false)
            })
    }

    const signIn = async (email: string, password: string) => {
        setLoading(true)
        setGlobalLoading(true)
        await signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'Nathan'
                showSuccess(`Welcome back, ${displayName}!`)

                // Record login activity
                try {
                    await fetch('/api/admin/activity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'login',
                            userId: user.uid,
                            userEmail: user.email,
                            userAgent: navigator.userAgent,
                        }),
                    })
                } catch (error) {
                    console.error('Failed to record login activity:', error)
                    // Don't fail the login if activity recording fails
                }

                // Don't redirect - stay on current page
                setLoading(false)
            })
            .catch((error) => {
                errorHandler.handleAuthError(error)
                setError(error.message)
                setLoading(false)
            })
            .finally(() => {
                setLoading(false)
                setGlobalLoading(false)
            })
    }

    const signInWithGoogle = async () => {
        setLoading(true)
        setGlobalLoading(true)
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
            .then(async (result) => {
                const user = result.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'there'

                // Check if this is a new user (getAdditionalUserInfo would be better but requires import)
                // For Google sign-in, we'll check the creation time
                const isNewUser =
                    result.user.metadata.creationTime === result.user.metadata.lastSignInTime

                if (isNewUser) {
                    showSuccess(`Welcome ${displayName}! Account created successfully.`)

                    // Record account creation in system stats
                    try {
                        await fetch('/api/auth/record-signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: user.uid,
                                email: user.email,
                            }),
                        })
                    } catch (error) {
                        console.error('Failed to record account creation:', error)
                        // Don't fail the signup if stats recording fails
                    }
                } else {
                    showSuccess(`Welcome back, ${displayName}!`)
                }

                // Record login activity (for both new and returning users)
                try {
                    await fetch('/api/admin/activity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'login',
                            userId: user.uid,
                            userEmail: user.email,
                            userAgent: navigator.userAgent,
                        }),
                    })
                } catch (error) {
                    console.error('Failed to record login activity:', error)
                    // Don't fail the login if activity recording fails
                }

                // Don't redirect - stay on current page
            })
            .catch((error) => {
                errorHandler.handleAuthError(error)
                setError(error.message)
            })
            .finally(() => {
                setLoading(false)
                setGlobalLoading(false)
            })
    }

    const logOut = async () => {
        setLoading(true)
        setGlobalLoading(true)
        signOut(auth)
            .then(() => {
                clearAuthCache() // Clear optimistic auth cache
                showSuccess('Successfully signed out. See you next time!')
            })
            .catch((error) => {
                errorHandler.handleAuthError(error)
                setError(error.message)
                setLoading(false)
            })
            .finally(() => {
                setLoading(false)
                setGlobalLoading(false)
            })
    }

    const resetPass = async (email: string) => {
        setPassResetSuccess(false)
        try {
            const response = await fetch('/api/auth/send-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send password reset email')
            }

            const emailSent = Boolean(data.emailSent)
            setPassResetSuccess(emailSent)
            showSuccess(
                data.message ||
                    (emailSent
                        ? 'Password reset email sent! Check your inbox for further steps.'
                        : 'If an account exists with this email, you will receive a password reset link.')
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to send password reset email. Please try again.'
            showError(message)
            setError(message)
            setPassResetSuccess(false)
        }
    }

    const memoedValue = useMemo(
        () => ({
            user,
            loading,
            wasRecentlyAuthenticated: wasRecentlyAuth,
            signUp,
            signIn,
            signInWithGoogle,
            logOut,
            error,
            resetPass,
            passResetSuccess,
            attemptPassReset,
            setAttemptPassReset,
            sendVerificationEmail,
        }),
        [
            user,
            loading,
            wasRecentlyAuth,
            error,
            passResetSuccess,
            attemptPassReset,
            signUp,
            signIn,
            signInWithGoogle,
            logOut,
            resetPass,
            sendVerificationEmail,
        ]
    )

    return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>
}

/**
 * Hook for accessing Firebase authentication context
 *
 * Provides access to the current user, authentication methods, and auth state.
 * Must be used within an AuthProvider component tree.
 *
 * @returns Authentication context with user, loading state, and auth methods
 *
 * @example
 * ```tsx
 * const { user, loading, signIn, logOut } = useAuth()
 *
 * if (loading) return <div>Loading...</div>
 *
 * if (user) {
 *   return <button onClick={logOut}>Sign Out</button>
 * }
 *
 * return <button onClick={() => signIn(email, password)}>Sign In</button>
 * ```
 */
export default function useAuth() {
    return useContext(AuthContext)
}
