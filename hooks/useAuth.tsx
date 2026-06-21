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
                // Return to the page the user started from after OAuth.
                await signIn('github', { callbackUrl: window.location.href })
            },
            signInWithEmail: async (email: string) => {
                // Sends the magic-link email via the active provider (stable id
                // "email"); redirect:false keeps the modal so it can show a
                // "check your inbox" message. callbackUrl is embedded in the link
                // so clicking it returns the user to this page, signed in.
                const res = await signIn('email', {
                    email,
                    redirect: false,
                    callbackUrl: window.location.href,
                })
                // With redirect:false the provider resolves { ok:false, error }
                // instead of throwing when the send fails (e.g. Brevo is down or
                // misconfigured). Surface it so the caller doesn't show a false
                // "check your inbox".
                if (res?.error) {
                    throw new Error(res.error)
                }
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
