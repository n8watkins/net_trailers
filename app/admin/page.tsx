'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'
import { getAccountStats } from '@/utils/accountLimits'
import {
    BarChart,
    Users,
    TrendingUp,
    Settings,
    PlayCircle,
    RefreshCw,
    Calendar,
    CalendarDays,
    Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { AdminStats, TrendingStats, ActivityStats, ActiveUser } from '@/types/admin'

// Admin UIDs - Add your Firebase UID here
const ADMIN_UIDS = [process.env.NEXT_PUBLIC_ADMIN_UID || 'YOUR_FIREBASE_UID_HERE']

export default function AdminDashboard() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isAuth = sessionType === 'authenticated'
    const { showSuccess, showError } = useToast()
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [trendingStats, setTrendingStats] = useState<TrendingStats | null>(null)
    const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(true)
    const [lastTrendingRun, setLastTrendingRun] = useState<Date | null>(null)

    // Auth check - wait for session to initialize before redirecting
    useEffect(() => {
        // Don't redirect while session is initializing
        if (!isInitialized) return

        // Redirect if not authenticated or not admin
        if (!isAuth || !userId || !ADMIN_UIDS.includes(userId)) {
            console.log('Admin check failed:', {
                isAuth,
                userId,
                isAdmin: userId && ADMIN_UIDS.includes(userId),
            })
            router.push('/')
        }
    }, [isAuth, userId, isInitialized, router])

    // Load stats
    useEffect(() => {
        if (isAuth && userId && ADMIN_UIDS.includes(userId)) {
            loadAllStats()
        }
    }, [isAuth, userId])

    const loadAllStats = async () => {
        setStatsLoading(true)
        try {
            // Load account stats
            const accountData = await getAccountStats()
            setStats(accountData as AdminStats)

            // Load trending stats
            try {
                const trendingResponse = await fetch('/api/admin/trending-stats', {
                    headers: {
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                    },
                })
                if (trendingResponse.ok) {
                    const trendingData = await trendingResponse.json()
                    setTrendingStats(trendingData)
                    setLastTrendingRun(trendingData.lastRun ? new Date(trendingData.lastRun) : null)
                } else {
                    console.error('Failed to load trending stats')
                }
            } catch (error) {
                console.error('Error loading trending stats:', error)
            }

            // Load activity stats
            try {
                const activityResponse = await fetch('/api/admin/activity?period=month', {
                    headers: {
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                    },
                })
                if (activityResponse.ok) {
                    const activityData = await activityResponse.json()
                    setActivityStats(activityData.stats)

                    // Get unique users from activities
                    const userMap = new Map<string, ActiveUser>()
                    activityData.activities.forEach((activity: any) => {
                        if (activity.userId && activity.userEmail) {
                            if (!userMap.has(activity.userId)) {
                                userMap.set(activity.userId, {
                                    userId: activity.userId,
                                    email: activity.userEmail,
                                    lastActive: activity.timestamp,
                                    activityCount: 0,
                                })
                            }
                            const user = userMap.get(activity.userId)!
                            user.activityCount++
                            if (activity.timestamp > user.lastActive) {
                                user.lastActive = activity.timestamp
                            }
                        }
                    })

                    // Sort by most recent activity
                    const users = Array.from(userMap.values()).sort(
                        (a, b) => b.lastActive - a.lastActive
                    )
                    setActiveUsers(users.slice(0, 10)) // Top 10 most active
                } else {
                    console.error('Failed to load activity stats')
                    showError('Failed to load activity statistics')
                }
            } catch (error) {
                console.error('Error loading activity stats:', error)
                showError('Failed to load activity statistics')
            }
        } catch (error) {
            console.error('Error loading stats:', error)
            showError('Failed to load admin statistics. Please refresh the page.')
        } finally {
            setStatsLoading(false)
        }
    }

    const runTrendingCheck = async (demoMode = false) => {
        setLoading(true)
        try {
            const response = await fetch(
                `/api/cron/update-trending${demoMode ? '?demo=true' : ''}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                    },
                }
            )
            const result = await response.json()

            if (response.ok) {
                showSuccess(
                    `Trending check complete: ${result.newItems} new items, ${result.notifications} notifications created`
                )
                await loadAllStats()
            } else {
                showError(result.error || 'Failed to run trending check')
            }
        } catch (error) {
            showError('Failed to run trending check')
        } finally {
            setLoading(false)
        }
    }

    const resetDemoAccounts = async () => {
        if (!confirm('Reset demo accounts to 5? This will delete test accounts.')) return

        setLoading(true)
        try {
            const response = await fetch('/api/admin/reset-demo', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                },
            })

            if (response.ok) {
                showSuccess('Demo accounts reset to 5')
                await loadAllStats()
            } else {
                showError('Failed to reset accounts')
            }
        } catch (error) {
            showError('Failed to reset accounts')
        } finally {
            setLoading(false)
        }
    }

    // Show loading while session initializes
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        )
    }

    // Show unauthorized if not admin
    if (!isAuth || !userId || !ADMIN_UIDS.includes(userId)) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Unauthorized</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">Portfolio project operations center</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Accounts - Clickable */}
                    <button
                        onClick={() => router.push('/admin/accounts')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-750 transition-colors cursor-pointer"
                        disabled={statsLoading}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Users className="h-8 w-8 text-blue-500" />
                            {statsLoading ? (
                                <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                            ) : (
                                <span className="text-2xl font-bold text-white">
                                    {stats?.totalAccounts || 0}
                                </span>
                            )}
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Total Accounts →</h3>
                        <div className="flex items-center justify-between">
                            {statsLoading ? (
                                <>
                                    <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <span className="text-xs text-gray-500">
                                        Limit: {stats?.maxAccounts || 50}
                                    </span>
                                    <span className="text-xs text-green-500">
                                        {(stats?.maxAccounts || 50) - (stats?.totalAccounts || 0)}{' '}
                                        remaining
                                    </span>
                                </>
                            )}
                        </div>
                    </button>

                    {/* Monthly Signups - Clickable */}
                    <button
                        onClick={() => router.push('/admin/signups')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <CalendarDays className="h-8 w-8 text-green-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.signupsThisMonth || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Signups This Month →</h3>
                        <span className="text-xs text-gray-500">View timeline and details</span>
                    </button>

                    {/* User Activity - Clickable */}
                    <button
                        onClick={() => router.push('/admin/activity')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Eye className="h-8 w-8 text-purple-500" />
                            <span className="text-2xl font-bold text-white">
                                {activityStats?.total || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Activity This Month →</h3>
                        <span className="text-xs text-gray-500">
                            {activityStats?.uniqueUsers || 0} users,{' '}
                            {activityStats?.uniqueGuests || 0} guests
                        </span>
                    </button>

                    {/* System Health */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Settings className="h-8 w-8 text-orange-500" />
                            <span className="text-sm font-medium text-green-500">Healthy</span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">System Status</h3>
                        <span className="text-xs text-gray-500">All systems operational</span>
                    </div>
                </div>

                {/* Action Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trending Controls */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Trending System Controls
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-900 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Production Mode
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    Run real trending check against TMDB API
                                </p>
                                <button
                                    onClick={() => runTrendingCheck(false)}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition"
                                >
                                    <PlayCircle className="h-4 w-4" />
                                    {loading ? 'Running...' : 'Check Trending Now'}
                                </button>
                            </div>

                            <div className="p-4 bg-gray-900 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Demo Mode
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    Guarantee finding new items for demonstration
                                </p>
                                <button
                                    onClick={() => runTrendingCheck(true)}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    {loading ? 'Running...' : 'Trigger Demo'}
                                </button>
                            </div>

                            {/* Cron Schedule Info */}
                            <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                                <p className="text-xs text-blue-400">
                                    <strong>Automatic Schedule:</strong> Every 6 hours (0:00, 6:00,
                                    12:00, 18:00 UTC)
                                </p>
                                <p className="text-xs text-blue-400 mt-1">
                                    Next run:{' '}
                                    {new Date(
                                        Date.now() + (6 - (new Date().getHours() % 6)) * 3600000
                                    ).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Account Management */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Account Management
                        </h2>

                        <div className="space-y-4">
                            {/* Account Graph */}
                            <div className="p-4 bg-gray-900 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-300 mb-3">
                                    Account Usage
                                </h3>
                                <div className="relative pt-1">
                                    <div className="flex mb-2 items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold inline-block text-blue-400">
                                                {Math.round(
                                                    ((stats?.totalAccounts || 0) /
                                                        (stats?.maxAccounts || 50)) *
                                                        100
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-semibold inline-block text-gray-400">
                                                {stats?.totalAccounts || 0} /{' '}
                                                {stats?.maxAccounts || 50}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                                        <div
                                            style={{
                                                width: `${((stats?.totalAccounts || 0) / (stats?.maxAccounts || 50)) * 100}%`,
                                            }}
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Demo Reset */}
                            <div className="p-4 bg-gray-900 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Demo Reset
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    Reset account count for portfolio demos (keeps first 5 accounts)
                                </p>
                                <button
                                    onClick={resetDemoAccounts}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Reset to 5 Accounts
                                </button>
                            </div>

                            {/* Recent Activity */}
                            <div className="p-4 bg-gray-900 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Recent Activity
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400">
                                        Last signup:{' '}
                                        {stats?.lastSignup
                                            ? new Date(stats.lastSignup).toLocaleString()
                                            : 'Never'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Today: {stats?.signupsToday || 0} signups
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Active Users This Month ({activeUsers.length})
                    </h2>
                    {activeUsers.length > 0 ? (
                        <div className="space-y-2">
                            {activeUsers.map((user) => (
                                <button
                                    key={user.userId}
                                    onClick={() =>
                                        router.push(`/admin/activity?userId=${user.userId}`)
                                    }
                                    className="w-full flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors text-left"
                                >
                                    <div>
                                        <p className="text-white font-medium">{user.email}</p>
                                        <p className="text-xs text-gray-500">
                                            {user.activityCount} events
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Last active</p>
                                        <p className="text-sm text-white">
                                            {new Date(user.lastActive).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(user.lastActive).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">No user activity recorded this month</p>
                    )}
                </div>

                {/* System Logs */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">System Logs</h2>
                    <div className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto">
                        <div className="space-y-2 font-mono text-xs">
                            <p className="text-gray-400">
                                [{new Date().toISOString()}] Admin dashboard accessed
                            </p>
                            {lastTrendingRun && (
                                <p className="text-green-400">
                                    [{lastTrendingRun.toISOString()}] Trending check completed
                                </p>
                            )}
                            {stats?.lastSignup && (
                                <p className="text-blue-400">
                                    [{new Date(stats.lastSignup).toISOString()}] New account created
                                </p>
                            )}
                            <p className="text-gray-500">Waiting for system events...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
