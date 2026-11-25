'use client'

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { Session } from 'next-auth'
import { signIn, signOut } from 'next-auth/react'

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
    signInWithEmail: (email: string, turnstileToken: string | null) => Promise<void>
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

/** Auth.js's session endpoint (auth.ts mounts Auth.js at /api/auth). */
const SESSION_URL = '/api/auth/session'
/** The channel next-auth/react's signIn and signOut announce changes on, in every tab. */
const AUTH_CHANNEL = 'next-auth'

/** One read of the session: the session, or null when signed out or on any failure. */
export async function fetchSession(): Promise<Session | null> {
    try {
        const res = await fetch(SESSION_URL, { headers: { 'Content-Type': 'application/json' } })
        if (!res.ok) return null
        const data = (await res.json()) as Session | null
        // Auth.js answers null (or {}) when there is no session
        return data && Object.keys(data).length > 0 ? data : null
    } catch {
        return null
    }
}

/**
 * Lets a server-rendered segment hand over the session it already read (see
 * SeedSession below). Only the settings and profile segments do this today.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const SeedSessionContext = createContext<(session: Session | null) => void>(() => {})

/**
 * Hands the session a server component read (`await auth()`) to the auth
 * context. It applies in the hydration commit, before the first paint and
 * before the provider would ask for it, so the page neither waits for nor
 * makes a request to GET /api/auth/session.
 *
 * Render it only with the session of the request being answered. A page that
 * renders it may be kept in the Worker's edge cache only for visitors without
 * a session cookie, for whom it is always null (worker/edgeCache.ts).
 */
export function SeedSession({ session }: { session: Session | null }) {
    const seed = useContext(SeedSessionContext)
    useLayoutEffect(() => {
        seed(session)
        // Only the first value matters: later changes come from the provider
    }, [])
    return null
}

/**
 * The visitor's session, read once per page load, and again when another tab
 * (or next-auth/react's signIn and signOut in this one) announces a change.
 *
 * This replaces next-auth/react's SessionProvider, which asked twice on every
 * page load: its own read announces itself on the broadcast channel, and its
 * listener answers that announcement with a second read (next-auth
 * 5.0.0-beta.32, getSession posts on a new channel object, which the provider's
 * own listener receives). Each signed-in read is a Worker request and a
 * database query. It also could not take a session a server component had
 * already read once it had mounted.
 *
 * Nothing re-reads the session when the tab regains focus, as before.
 */
function useSessionState(): {
    session: Session | null | undefined
    seed: (session: Session | null) => void
} {
    // undefined while unknown
    const [session, setSession] = useState<Session | null | undefined>(undefined)
    const known = useRef(false)

    const seed = useCallback((value: Session | null) => {
        if (known.current) return
        known.current = true
        setSession(value)
    }, [])

    const refresh = useCallback(async () => {
        const value = await fetchSession()
        known.current = true
        setSession(value)
    }, [])

    // Child layout effects (SeedSession) run before this, so a seeded page skips the read
    useEffect(() => {
        if (!known.current) void refresh()
    }, [refresh])

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return
        const channel = new BroadcastChannel(AUTH_CHANNEL)
        channel.onmessage = (event: MessageEvent<{ event?: string }>) => {
            if (event.data?.event === 'session') void refresh()
        }
        return () => channel.close()
    }, [refresh])

    return { session, seed }
}

/** Reads the Auth.js session and exposes the legacy auth context shape. */
function AuthStateProvider({ children }: AuthProviderProps) {
    const { session, seed } = useSessionState()
    const { showSuccess } = useToast()

    const loading = session === undefined
    const sUser = session?.user

    const user: AuthUser | null = sUser
        ? {
              uid: sUser.id,
              email: sUser.email ?? null,
              displayName: sUser.name ?? null,
              photoURL: sUser.image ?? null,
              image: sUser.image ?? null,
              name: sUser.name ?? null,
              emailVerified: true, // Magic-link sign-in proves the address.
              isAdmin: Boolean(sUser.isAdmin),
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
            signInWithEmail: async (email: string, turnstileToken: string | null) => {
                // Sends the magic-link email via the active provider (stable id
                // "email"); redirect:false keeps the modal so it can show a
                // "check your inbox" message. callbackUrl is embedded in the link
                // so clicking it returns the user to this page, signed in. The
                // Turnstile token goes in the same form body; the server checks
                // it before Auth.js runs (lib/turnstile.ts).
                const res = await signIn('email', {
                    email,
                    'cf-turnstile-response': turnstileToken ?? '',
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

    return (
        <SeedSessionContext.Provider value={seed}>
            <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
        </SeedSessionContext.Provider>
    )
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    return <AuthStateProvider>{children}</AuthStateProvider>
}

/**
 * Hook for accessing authentication context (Auth.js, email magic links).
 *
 * @example
 * const { user, loading, signInWithEmail, logOut } = useAuth()
 */
export default function useAuth() {
    return useContext(AuthContext)
}
