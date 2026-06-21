/**
 * Admin Authentication Hook
 *
 * Reads admin status from the Auth.js session (exposed via useAuth). Admin
 * identity is derived server-side from ADMIN_GITHUB_LOGIN, so the client never
 * sees the admin identifier — only the resolved boolean.
 */

import useAuth from './useAuth'

interface UseAdminAuthResult {
    isAdmin: boolean
    isLoading: boolean
    error: string | null
}

export function useAdminAuth(): UseAdminAuthResult {
    const { isAdmin, loading } = useAuth()
    return { isAdmin, isLoading: loading, error: null }
}
