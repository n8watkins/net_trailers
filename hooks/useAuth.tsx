import React, {
    useState,
    useContext,
    createContext,
    useEffect,
    useLayoutEffect,
    useMemo,
} from 'react'

import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    User,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
} from 'firebase/auth'

import { auth } from '../firebase'
import { useRouter } from 'next/router'
import { useAppStore } from '../stores/appStore'
import { createErrorHandler } from '../utils/errorHandler'
import { useToast } from './useToast'
import { cacheAuthState, clearAuthCache, wasRecentlyAuthenticated } from '../utils/authCache'
import { authLog, authError } from '../utils/authLogger'

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
}

export const AuthContext = createContext<iAuth>({
    user: null,
    loading: false,
    wasRecentlyAuthenticated: false,
    signUp: async () => {},
    signIn: async () => {},
    signInWithGoogle: async () => {},
    logOut: async () => {},
    error: null,
    resetPass: async () => {},
    passResetSuccess: false,
    attemptPassReset: false,
    setAttemptPassReset: () => {},
})

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true) // Start with loading true until auth state is known
    const [authInitialized, setAuthInitialized] = useState(false)
    const [passResetSuccess, setPassResetSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const [attemptPassReset, setAttemptPassReset] = useState(false)
    const setGlobalLoading = useAppStore((state) => state.setLoading)
    const { showSuccess, showError } = useToast()
    const errorHandler = createErrorHandler(showError)

    // Check if user was recently authenticated (optimistic check)
    // Must use state to avoid hydration mismatch (localStorage only on client)
    const [wasRecentlyAuth, setWasRecentlyAuth] = useState(false)

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
                    cacheAuthState(user.uid)
                    authLog('✅ User is authenticated:', user.email)
                } else {
                    // Clear cache when user signs out
                    clearAuthCache()
                    authLog('🎭 User signed out or not authenticated')
                }
            },
            (error) => {
                authError('🚨 Firebase Auth Error:', error)
                setLoading(false)
                setAuthInitialized(true)
            }
        )

        return unsubscribe
    }, [])

    const signUp = async (email: string, password: string) => {
        setLoading(true)
        setGlobalLoading(true)
        await createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'there'
                showSuccess(`Welcome ${displayName}! Account created successfully.`)
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
            .then((userCredential) => {
                const user = userCredential.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'Nathan'
                showSuccess(`Welcome back, ${displayName}!`)
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
            .then((result) => {
                const credential = GoogleAuthProvider.credentialFromResult(result)
                const token = credential!.accessToken
                const user = result.user
                const displayName = user.displayName || user.email?.split('@')[0] || 'there'
                showSuccess(`Welcome ${displayName}!`)
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
        await sendPasswordResetEmail(auth, email)
            .then(() => {
                setPassResetSuccess(true)
                showSuccess('Password reset email sent! Check your inbox.')
            })
            .catch((error) => {
                errorHandler.handleAuthError(error)
                setError(error.message)
                setPassResetSuccess(false)
            })
            .finally(() => {})
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
        ]
    )

    return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>
}

export default function useAuth() {
    return useContext(AuthContext)
}
