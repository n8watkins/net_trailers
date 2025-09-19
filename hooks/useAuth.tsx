import React, {
    useState,
    useContext,
    createContext,
    useEffect,
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
import { useRecoilState } from 'recoil'
import { errorsState, loadingState } from '../atoms/errorAtom'
import { createErrorHandler } from '../utils/errorHandler'

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
    const [errors, setErrors] = useRecoilState(errorsState)
    const [globalLoading, setGlobalLoading] = useRecoilState(loadingState)
    const errorHandler = createErrorHandler(setErrors)

    // console.log('auth.js-attemptPassReset', attemptPassReset)
    useEffect(() => {
        // else if (attemptPassReset) {
        //     router.push('/reset') }
        onAuthStateChanged(auth, (user) => {
            // console.log('onAuthStateChanged')
            setUser(user)
            setLoading(false)
            if (user) {
                router.push('/')
            } else if (router.pathname === '/reset') {
                setUser(null)
                setLoading(false)
            } else if (!user) {
                setUser(null)
                setLoading(false)

                // Check if user is in guest mode before redirecting to login
                const isGuestMode = localStorage.getItem('nettrailer_guest_id')
                const isOnHomePage = router.pathname === '/'

                // Only redirect to login if not in guest mode and not on home page
                if (!isGuestMode && !isOnHomePage) {
                    router.push('/login')
                }
            }
        })
    }, [])

    const signUp = async (email: string, password: string) => {
        setLoading(true)
        setGlobalLoading(true)
        await createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user
                errorHandler.addSuccess('Account created successfully! Welcome to NetTrailer.')
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
                errorHandler.addSuccess('Successfully signed in! Welcome back.')
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
                const credential =
                    GoogleAuthProvider.credentialFromResult(result)
                const token = credential!.accessToken
                const user = result.user
                errorHandler.addSuccess('Successfully signed in with Google!')
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
                errorHandler.addSuccess('Successfully signed out. See you next time!')
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
                errorHandler.addSuccess('Password reset email sent! Check your inbox.')
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
        [user, loading, error, passResetSuccess, attemptPassReset]
    )

    return (
        <AuthContext.Provider value={memoedValue}>
            {children}
        </AuthContext.Provider>
    )
}

export default function useAuth() {
    return useContext(AuthContext)
}
