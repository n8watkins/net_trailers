/**
 * Account Limits & Anti-Abuse System
 *
 * Prevents malicious account creation and unexpected Firestore costs
 * by enforcing hard limits on total accounts and rate limiting per IP.
 *
 * IMPORTANT: For portfolio projects, these limits prevent:
 * 1. Bot attacks creating thousands of accounts
 * 2. Unexpected Firebase charges
 * 3. Database pollution
 */

import { collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Account Limits Configuration
 *
 * Adjust these values based on your portfolio needs:
 * - MAX_TOTAL_ACCOUNTS: Hard ceiling (recommended: 20-100 for portfolio)
 * - MAX_ACCOUNTS_PER_IP: Prevent single IP from creating many accounts
 * - MAX_ACCOUNTS_PER_DOMAIN: Prevent abuse of temp email services
 */
export const ACCOUNT_LIMITS = {
    /** Maximum total accounts allowed (across all time) */
    MAX_TOTAL_ACCOUNTS: parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS || '50', 10),

    /** Maximum accounts per IP address (24-hour window) */
    MAX_ACCOUNTS_PER_IP: 3,

    /** Maximum accounts per email domain (prevent @tempmail.com abuse) */
    MAX_ACCOUNTS_PER_DOMAIN: 5,

    /** Time window for IP rate limiting (milliseconds) */
    IP_RATE_LIMIT_WINDOW: 24 * 60 * 60 * 1000, // 24 hours

    /** Time window for domain rate limiting (milliseconds) */
    DOMAIN_RATE_LIMIT_WINDOW: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const

/**
 * Account creation log entry
 */
export interface AccountCreationLog {
    userId: string
    ipAddress: string
    emailDomain: string
    createdAt: number
    userAgent?: string
}

/**
 * Result of account creation check
 */
export interface AccountCreationCheck {
    allowed: boolean
    reason?: string
    stats?: {
        totalAccounts: number
        accountsFromIP: number
        accountsFromDomain: number
    }
}

/**
 * Get total number of accounts created
 */
export async function getTotalAccountCount(): Promise<number> {
    try {
        const logsRef = collection(db, 'accountCreationLog')
        const snapshot = await getDocs(logsRef)
        return snapshot.size
    } catch (error) {
        console.error('Error fetching total account count:', error)
        // Fail open: Allow account creation if we can't check (prevents lockout)
        return 0
    }
}

/**
 * Get number of accounts created from a specific IP within time window
 */
export async function getAccountCountByIP(ipAddress: string): Promise<number> {
    try {
        const now = Date.now()
        const windowStart = now - ACCOUNT_LIMITS.IP_RATE_LIMIT_WINDOW

        const logsRef = collection(db, 'accountCreationLog')
        const q = query(
            logsRef,
            where('ipAddress', '==', ipAddress),
            where('createdAt', '>=', windowStart)
        )
        const snapshot = await getDocs(q)
        return snapshot.size
    } catch (error) {
        console.error('Error fetching account count by IP:', error)
        return 0
    }
}

/**
 * Get number of accounts created with a specific email domain within time window
 */
export async function getAccountCountByDomain(domain: string): Promise<number> {
    try {
        const now = Date.now()
        const windowStart = now - ACCOUNT_LIMITS.DOMAIN_RATE_LIMIT_WINDOW

        const logsRef = collection(db, 'accountCreationLog')
        const q = query(
            logsRef,
            where('emailDomain', '==', domain.toLowerCase()),
            where('createdAt', '>=', windowStart)
        )
        const snapshot = await getDocs(q)
        return snapshot.size
    } catch (error) {
        console.error('Error fetching account count by domain:', error)
        return 0
    }
}

/**
 * Check if account creation is allowed
 *
 * @param ipAddress - User's IP address (from headers)
 * @param email - User's email address
 * @returns Check result with reason if not allowed
 */
export async function canCreateAccount(
    ipAddress?: string | null,
    email?: string
): Promise<AccountCreationCheck> {
    try {
        // Get all counts in parallel
        const [totalAccounts, accountsFromIP, accountsFromDomain] = await Promise.all([
            getTotalAccountCount(),
            ipAddress ? getAccountCountByIP(ipAddress) : Promise.resolve(0),
            email ? getAccountCountByDomain(email.split('@')[1] || '') : Promise.resolve(0),
        ])

        // Check total account limit (hard ceiling)
        if (totalAccounts >= ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS) {
            return {
                allowed: false,
                reason: `Account limit reached. This is a portfolio project with a maximum of ${ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS} accounts. Please contact the developer if you need access.`,
                stats: {
                    totalAccounts,
                    accountsFromIP,
                    accountsFromDomain,
                },
            }
        }

        // Check IP-based rate limit
        if (ipAddress && accountsFromIP >= ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_IP) {
            return {
                allowed: false,
                reason: `Too many accounts created from your location. Maximum ${ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_IP} accounts per 24 hours. Please try again later.`,
                stats: {
                    totalAccounts,
                    accountsFromIP,
                    accountsFromDomain,
                },
            }
        }

        // Check email domain rate limit
        if (email && accountsFromDomain >= ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_DOMAIN) {
            return {
                allowed: false,
                reason: `Too many accounts created with this email domain. Maximum ${ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_DOMAIN} accounts per week.`,
                stats: {
                    totalAccounts,
                    accountsFromIP,
                    accountsFromDomain,
                },
            }
        }

        // All checks passed
        return {
            allowed: true,
            stats: {
                totalAccounts,
                accountsFromIP,
                accountsFromDomain,
            },
        }
    } catch (error) {
        console.error('Error checking account creation:', error)
        // Fail open: Allow account creation if we can't check
        // This prevents system errors from locking out legitimate users
        return {
            allowed: true,
            reason: 'Unable to verify limits, proceeding with caution',
        }
    }
}

/**
 * Log account creation for rate limiting and auditing
 *
 * Call this AFTER successfully creating the Firebase Auth user
 *
 * @param userId - Firebase Auth UID
 * @param ipAddress - User's IP address
 * @param email - User's email address
 * @param userAgent - User's browser user agent
 */
export async function logAccountCreation(
    userId: string,
    ipAddress: string | null,
    email: string,
    userAgent?: string
): Promise<void> {
    try {
        const domain = email.split('@')[1] || 'unknown'

        const logEntry: AccountCreationLog = {
            userId,
            ipAddress: ipAddress || 'unknown',
            emailDomain: domain.toLowerCase(),
            createdAt: Date.now(),
            ...(userAgent ? { userAgent } : {}),
        }

        const logsRef = collection(db, 'accountCreationLog')
        await addDoc(logsRef, logEntry)

        console.log('✅ Account creation logged:', {
            userId,
            ipAddress: logEntry.ipAddress,
            domain: logEntry.emailDomain,
        })
    } catch (error) {
        // Don't throw - logging failure shouldn't prevent account creation
        console.error('Failed to log account creation:', error)
    }
}

/**
 * Get account usage statistics (for public display)
 *
 * @returns Public stats showing how many slots are available
 */
export async function getAccountStats(): Promise<{
    used: number
    max: number
    available: number
    percentUsed: number
}> {
    try {
        const used = await getTotalAccountCount()
        const max = ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS
        const available = Math.max(0, max - used)
        const percentUsed = Math.round((used / max) * 100)

        return {
            used,
            max,
            available,
            percentUsed,
        }
    } catch (error) {
        console.error('Error fetching account stats:', error)
        return {
            used: 0,
            max: ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS,
            available: ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS,
            percentUsed: 0,
        }
    }
}

/**
 * Blocked email domains (temporary/disposable email services)
 *
 * Add domains here to prevent abuse from temporary email services
 */
export const BLOCKED_EMAIL_DOMAINS = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    // Add more as needed
] as const

/**
 * Check if email domain is blocked
 */
export function isEmailDomainBlocked(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return false

    return BLOCKED_EMAIL_DOMAINS.includes(domain as any)
}
