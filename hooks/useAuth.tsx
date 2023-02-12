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
                router.push('/login')
            }
        })
    }, [])

    const signUp = async (email: string, password: string) => {
        setLoading(true)
        await createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user
                router.push('/')
                setLoading(false)
            })
            .catch((error) => {
                const errorCode = error.code
                const errorMessage = error.message
                alert(errorMessage)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const signIn = async (email: string, password: string) => {
        setLoading(true)
        await signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user
                router.push('/')
                setLoading(false)
            })
            .catch((error) => {
                const errorCode = error.code
                const errorMessage = error.message
                alert(errorMessage)
                setLoading(false)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const signInWithGoogle = async () => {
        setLoading(true)
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
            .then((result) => {
                const credential =
                    GoogleAuthProvider.credentialFromResult(result)
                const token = credential!.accessToken
                const user = result.user
            })
            .catch((error) => {
                const errorCode = error.code
                const errorMessage = error.message
                const email = error.email
                const credential = GoogleAuthProvider.credentialFromError(error)
            })
    }
    const logOut = async () => {
        setLoading(true)
        signOut(auth)
            .then(() => {})
            .catch((error) => {
                alert(error.message)
                setError(error.message)
                setLoading(false)
            })
            .finally(() => {
                setLoading(false)
            })
    }
    const resetPass = async (email: string) => {
        await sendPasswordResetEmail(auth, email)
            .then(() => {
                setPassResetSuccess(true)
            })
            .catch((error) => {
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
