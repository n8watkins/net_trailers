/**
 * TypeScript interfaces for Admin Panel
 */

export interface AdminStats {
    totalAccounts: number
    signupsThisWeek: number
    signupsThisMonth: number
    signupsToday?: number
    lastSignup: number | null
    lastSignupEmail?: string
    lastReset?: number
    currentWeekStart?: number
    currentMonthStart?: number
}

/** One account as GET /api/admin/users returns it. Dates are ISO strings or null when unknown. */
export interface AdminUserRow {
    uid: string
    email: string
    displayName: string
    photoURL: string | null
    emailVerified: boolean
    createdAt: string | null
    lastSignInAt: string | null
    /** 'email' and/or the OAuth providers linked to the account (e.g. 'github'). */
    providers: string[]
}

export interface TrendingStats {
    lastRun: number | null
    itemsFound?: number
    notificationsCreated?: number
}

export interface ActivityStats {
    total: number
    uniqueUsers: number
    uniqueGuests: number
    activeDays: number
    avgPerDay: number
}

export interface ActiveUser {
    userId: string
    email: string
    lastActive: number
    activityCount: number
}

export interface Activity {
    id: string
    type: 'login' | 'view'
    userId?: string
    guestId?: string
    userEmail?: string
    page?: string
    userAgent?: string
    timestamp: number
}
