/**
 * Admin Authentication Hook
 *
 * Client-side hook that checks admin status via server-side API.
 * This keeps admin UIDs server-side only, never exposed to the client bundle.
 */

import { useState, useEffect } from 'react'
import { auth } from '@/firebase'

interface UseAdminAuthResult {
    isAdmin: boolean
    isLoading: boolean
    error: string | null
}

export function useAdminAuth(): UseAdminAuthResult {
    const [isAdmin, setIsAdmin] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const user = auth.currentUser
                if (!user) {
                    setIsAdmin(false)
                    setIsLoading(false)
                    return
                }

                // Get fresh ID token
                const idToken = await user.getIdToken()

                // Check admin status via server-side API
                const response = await fetch('/api/admin/check', {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    setIsAdmin(data.isAdmin === true)
                } else {
                    setIsAdmin(false)
                }
            } catch (err) {
                console.error('Admin auth check failed:', err)
                setError(err instanceof Error ? err.message : 'Failed to check admin status')
                setIsAdmin(false)
            } finally {
                setIsLoading(false)
            }
        }

        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                checkAdminStatus()
            } else {
                setIsAdmin(false)
                setIsLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    return { isAdmin, isLoading, error }
}
