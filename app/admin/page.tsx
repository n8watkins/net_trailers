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

interface UserInfo {
    uid: string
    email: string
    displayName: string
    photoURL?: string
    emailVerified: boolean
    disabled: boolean
    createdAt: string
    lastSignInAt: string
    providerData: Array<{ providerId: string; uid: string }>
}

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
    const [stats, setStats] = useState<any>(null)
    const [trendingStats, setTrendingStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [lastTrendingRun, setLastTrendingRun] = useState<Date | null>(null)
    const [showUserModal, setShowUserModal] = useState(false)
    const [users, setUsers] = useState<UserInfo[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)

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
        try {
            const accountData = await getAccountStats()
            setStats(accountData)

            // Load trending stats
            const trendingResponse = await fetch('/api/admin/trending-stats', {
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                },
            })
            if (trendingResponse.ok) {
                const trendingData = await trendingResponse.json()
                setTrendingStats(trendingData)
                setLastTrendingRun(trendingData.lastRun ? new Date(trendingData.lastRun) : null)
            }
        } catch (error) {
            console.error('Error loading stats:', error)
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

    const loadUsers = async () => {
        setLoadingUsers(true)
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setUsers(data.users)
                setShowUserModal(true)
            } else {
                showError('Failed to load users')
            }
        } catch (error) {
            showError('Failed to load users')
        } finally {
            setLoadingUsers(false)
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
                    {/* Account Stats - Clickable */}
                    <button
                        onClick={loadUsers}
                        disabled={loadingUsers}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-750 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Users className="h-8 w-8 text-blue-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.totalAccounts || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">
                            Total Accounts {loadingUsers ? '(Loading...)' : '(Click to view)'}
                        </h3>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Limit: {stats?.maxAccounts || 50}
                            </span>
                            <span className="text-xs text-green-500">
                                {(stats?.maxAccounts || 50) - (stats?.totalAccounts || 0)} remaining
                            </span>
                        </div>
                    </button>

                    {/* Weekly Signups */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Calendar className="h-8 w-8 text-green-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.signupsThisWeek || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Signups This Week</h3>
                        <span className="text-xs text-gray-500">
                            Last:{' '}
                            {stats?.lastSignup
                                ? new Date(stats.lastSignup).toLocaleDateString()
                                : 'Never'}
                        </span>
                    </div>

                    {/* Monthly Signups */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CalendarDays className="h-8 w-8 text-indigo-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.signupsThisMonth || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Signups This Month</h3>
                        <span className="text-xs text-gray-500">
                            Since{' '}
                            {new Date(
                                new Date().getFullYear(),
                                new Date().getMonth(),
                                1
                            ).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Trending Stats */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="h-8 w-8 text-purple-500" />
                            <span className="text-2xl font-bold text-white">
                                {trendingStats?.totalNotifications || 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Trending Notifications</h3>
                        <span className="text-xs text-gray-500">
                            Last run: {lastTrendingRun?.toLocaleString() || 'Never'}
                        </span>
                    </div>

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

                {/* User List Modal */}
                {showUserModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white">
                                        All Users ({users.length})
                                    </h2>
                                    <button
                                        onClick={() => setShowUserModal(false)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <svg
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-3">
                                    {users.map((user) => (
                                        <div
                                            key={user.uid}
                                            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-850 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    {user.photoURL ? (
                                                        <img
                                                            src={user.photoURL}
                                                            alt={user.displayName}
                                                            className="h-10 w-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                                            {user.displayName
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="text-white font-medium">
                                                            {user.displayName}
                                                        </h3>
                                                        <p className="text-gray-400 text-sm">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Joined</p>
                                                    <p className="text-sm text-white">
                                                        {new Date(
                                                            user.createdAt
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-4 text-xs">
                                                <span
                                                    className={`px-2 py-1 rounded ${user.emailVerified ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}
                                                >
                                                    {user.emailVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                                <span className="text-gray-500">
                                                    Last sign-in:{' '}
                                                    {new Date(
                                                        user.lastSignInAt
                                                    ).toLocaleDateString()}
                                                </span>
                                                <span className="text-gray-500">
                                                    Provider:{' '}
                                                    {user.providerData[0]?.providerId.replace(
                                                        '.com',
                                                        ''
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-700">
                                <button
                                    onClick={() => setShowUserModal(false)}
                                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
