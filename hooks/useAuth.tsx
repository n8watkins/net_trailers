'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react'

import { useToast } from './useToast'

interface AuthProviderProps {
    children: React.ReactNode
}

/**
 * Compatibility user shape. Mirrors the fields the app previously read off the
 * Firebase `User` object (notably `uid`) so consuming components keep working.
 */
export interface AuthUser {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    image: string | null
    name: string | null
    emailVerified: boolean
    isAdmin: boolean
    githubLogin: string | null
}

interface iAuth {
    user: AuthUser | null
    loading: boolean
    /** Kept for API compatibility with useAuthStatus' optimistic-auth check. */
    wasRecentlyAuthenticated: boolean
    isAdmin: boolean
    error: string | null
    signInWithGitHub: () => Promise<void>
    /** Send a passwordless magic-link sign-in email. Resolves once the email is sent. */
    signInWithEmail: (email: string) => Promise<void>
    logOut: () => Promise<void>
}

const defaultValue: iAuth = {
    user: null,
    loading: false,
    wasRecentlyAuthenticated: false,
    isAdmin: false,
    error: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    signInWithGitHub: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    signInWithEmail: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logOut: async () => {},
}

export const AuthContext = createContext<iAuth>(defaultValue)

/** Reads the Auth.js session and exposes the legacy auth context shape. */
function AuthStateProvider({ children }: AuthProviderProps) {
    const { data: session, status } = useSession()
    const { showSuccess } = useToast()

    const loading = status === 'loading'
    const sUser = session?.user

    const user: AuthUser | null = sUser
        ? {
              uid: sUser.id,
              email: sUser.email ?? null,
              displayName: sUser.name ?? null,
              photoURL: sUser.image ?? null,
              image: sUser.image ?? null,
              name: sUser.name ?? null,
              emailVerified: true, // GitHub accounts are pre-verified.
              isAdmin: Boolean(sUser.isAdmin),
              githubLogin: sUser.githubLogin ?? null,
          }
        : null

    const value = useMemo<iAuth>(
        () => ({
            user,
            loading,
            wasRecentlyAuthenticated: Boolean(user),
            isAdmin: Boolean(user?.isAdmin),
            error: null,
            signInWithGitHub: async () => {
                await signIn('github')
            },
            signInWithEmail: async (email: string) => {
                // Sends the magic-link email; does not redirect so the modal can
                // show a "check your inbox" message.
                await signIn('resend', { email, redirect: false })
            },
            logOut: async () => {
                await signOut({ redirect: false })
                showSuccess('Successfully signed out. See you next time!')
            },
        }),
        [user?.uid, user?.isAdmin, loading]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    return (
        <SessionProvider>
            <AuthStateProvider>{children}</AuthStateProvider>
        </SessionProvider>
    )
}

/**
 * Hook for accessing authentication context (Auth.js / GitHub).
 *
 * @example
 * const { user, loading, signInWithGitHub, logOut } = useAuth()
 */
export default function useAuth() {
    return useContext(AuthContext)
}
