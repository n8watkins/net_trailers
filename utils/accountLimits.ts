/**
 * Account Limits System
 *
 * Simple count-based limiting for portfolio projects.
 * Prevents runaway costs by enforcing a hard limit on total accounts.
 *
 * Backed by Turso/Drizzle — replaced former Firestore system/stats document.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'

export interface AccountStats {
    totalAccounts: number
    maxAccounts: number
    lastSignup: number | null
    signupsThisWeek: number
    signupsThisMonth: number
    lastReset?: number
    currentWeekStart?: number
    currentMonthStart?: number
}

/**
 * Get current account statistics.
 * Counts rows in the Turso `user` table.
 */
export async function getAccountStats(): Promise<AccountStats> {
    try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(users)

        const totalAccounts = Number(result[0]?.count ?? 0)
        const maxAccounts = parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS || '50')

        return {
            totalAccounts,
            maxAccounts,
            lastSignup: null, // Not tracked in Turso (no separate signupLog)
            signupsThisWeek: 0, // Not tracked — simplification noted
            signupsThisMonth: 0, // Not tracked — simplification noted
        }
    } catch (error) {
        console.error('Error getting account stats:', error)
        return {
            totalAccounts: 0,
            maxAccounts: 50,
            lastSignup: null,
            signupsThisWeek: 0,
            signupsThisMonth: 0,
        }
    }
}

/**
 * Check if account creation is allowed.
 * Auth.js creates the user row before we can gate it here, so this is
 * informational. To enforce the limit, call this from the signIn callback
 * or a post-sign-in server action.
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
 * Record a new account creation.
 * With Turso, account creation is handled by Auth.js automatically (it inserts
 * the user row). This function is a no-op kept for call-site compatibility;
 * callers that previously relied on the Firestore signupLog can be removed.
 */
export async function recordAccountCreation(userId: string, email: string) {
    // Auth.js already inserted the row. Nothing else to do.
    console.log('Account creation recorded (Turso user row created by Auth.js):', { userId, email })
    return { success: true }
}

/**
 * Get account usage statistics for public display.
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
