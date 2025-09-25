import React, { useState, useContext, createContext, useEffect, useMemo } from 'react'

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
import { useRecoilState } from 'recoil'
import { loadingState } from '../atoms/errorAtom'
import { createErrorHandler } from '../utils/errorHandler'
import { useToast } from './useToast'

interface AuthProviderProps {
    children: React.ReactNode
}

interface iAuth {
    user: User | null
    loading: boolean
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
    const [loading, setLoading] = useState(false)
    const [passResetSuccess, setPassResetSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const [attemptPassReset, setAttemptPassReset] = useState(false)
    const [globalLoading, setGlobalLoading] = useRecoilState(loadingState)
    const { showSuccess, showError } = useToast()
    const errorHandler = createErrorHandler(showError)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)

            // Session management is now handled by useSessionManager
            // No automatic redirection or guest mode checking here
            // Components can check session state and handle routing appropriately

            if (user) {
                // User authenticated - session manager will handle the transition
                console.log('🔐 User authenticated:', user.uid)
            } else {
                // User signed out - session manager will handle cleanup
                console.log('🎭 User signed out, switching to guest mode')
            }
        })

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
                router.push('/')
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
                router.push('/')
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
                router.push('/')
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
