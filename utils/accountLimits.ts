/**
 * Simplified Account Limits System
 *
 * Simple count-based limiting for portfolio projects.
 * Prevents runaway costs by enforcing a hard limit on total accounts.
 */

import { doc, getDoc, setDoc, increment } from 'firebase/firestore'
import { db } from '../firebase'

const SYSTEM_DOC = 'system/stats'

export interface AccountStats {
    totalAccounts: number
    maxAccounts: number
    lastSignup: number | null
    signupsToday: number
    lastReset?: number
}

/**
 * Get current account statistics
 */
export async function getAccountStats(): Promise<AccountStats> {
    try {
        const statsDoc = await getDoc(doc(db, SYSTEM_DOC))
        const data = statsDoc.data()

        return {
            totalAccounts: data?.totalAccounts || 0,
            maxAccounts: parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS || '50'),
            lastSignup: data?.lastSignup || null,
            signupsToday: data?.signupsToday || 0,
            lastReset: data?.lastReset || undefined,
        }
    } catch (error) {
        console.error('Error getting account stats:', error)
        return {
            totalAccounts: 0,
            maxAccounts: 50,
            lastSignup: null,
            signupsToday: 0,
        }
    }
}

/**
 * Check if account creation is allowed
 */
export async function canCreateAccount(): Promise<{
    allowed: boolean
    reason?: string
    stats?: AccountStats
}> {
    const stats = await getAccountStats()

    if (stats.totalAccounts >= stats.maxAccounts) {
        return {
            allowed: false,
            reason: `Account limit reached (${stats.maxAccounts} max). This is a portfolio project with limited capacity.`,
            stats,
        }
    }

    return { allowed: true, stats }
}

/**
 * Record a new account creation
 * This should be called from server-side code only
 */
export async function recordAccountCreation(userId: string, email: string) {
    try {
        // Update system stats
        await setDoc(
            doc(db, SYSTEM_DOC),
            {
                totalAccounts: increment(1),
                signupsToday: increment(1),
                lastSignup: Date.now(),
                lastSignupEmail: email,
            },
            { merge: true }
        )

        // Log the signup (simplified - no IP tracking)
        await setDoc(doc(db, 'signupLog', userId), {
            userId,
            email,
            createdAt: Date.now(),
        })

        console.log('✅ Account creation recorded:', { userId, email })
        return { success: true }
    } catch (error) {
        console.error('Error recording account:', error)
        return { success: false, error }
    }
}

/**
 * Get account usage statistics for public display
 */
export async function getPublicAccountStats(): Promise<{
    used: number
    max: number
    available: number
    percentUsed: number
}> {
    try {
        const stats = await getAccountStats()
        const available = Math.max(0, stats.maxAccounts - stats.totalAccounts)
        const percentUsed = Math.round((stats.totalAccounts / stats.maxAccounts) * 100)

        return {
            used: stats.totalAccounts,
            max: stats.maxAccounts,
            available,
            percentUsed,
        }
    } catch (error) {
        console.error('Error fetching public account stats:', error)
        return {
            used: 0,
            max: 50,
            available: 50,
            percentUsed: 0,
        }
    }
}
