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
