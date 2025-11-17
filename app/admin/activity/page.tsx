'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'
import { ArrowLeft, LogIn, Eye, TrendingUp, Users } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface Activity {
    id: string
    type: 'login' | 'view'
    userId?: string
    guestId?: string
    userEmail?: string
    page?: string
    userAgent?: string
    timestamp: number
}

interface ActivityStats {
    total: number
    uniqueUsers: number
    uniqueGuests: number
    activeDays: number
    avgPerDay: number
}

// Admin UIDs
const ADMIN_UIDS = [process.env.NEXT_PUBLIC_ADMIN_UID || 'YOUR_FIREBASE_UID_HERE']

export default function ActivityPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isAuth = sessionType === 'authenticated'
    const { showError } = useToast()

    const [activities, setActivities] = useState<Activity[]>([])
    const [activityByDay, setActivityByDay] = useState<Record<string, Activity[]>>({})
    const [stats, setStats] = useState<ActivityStats>({
        total: 0,
        uniqueUsers: 0,
        uniqueGuests: 0,
        activeDays: 0,
        avgPerDay: 0,
    })
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'logins' | 'views' | 'all'>('all')
    const [timeframe, setTimeframe] = useState<'week' | 'month'>('month')

    // Auth check
    useEffect(() => {
        if (!isInitialized) return
        if (!isAuth || !userId || !ADMIN_UIDS.includes(userId)) {
            router.push('/')
        }
    }, [isAuth, userId, isInitialized, router])

    // Load activity
    useEffect(() => {
        if (isAuth && userId && ADMIN_UIDS.includes(userId)) {
            loadActivity()
        }
    }, [isAuth, userId, activeTab, timeframe])

    const loadActivity = async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `/api/admin/activity?type=${activeTab}&period=${timeframe}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setActivities(data.activities)
                setActivityByDay(data.activityByDay)
                setStats(data.stats)
            } else {
                showError('Failed to load activity')
            }
        } catch (error) {
            showError('Failed to load activity')
        } finally {
            setLoading(false)
        }
    }

    const sortedDays = Object.keys(activityByDay).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )

    if (!isInitialized || loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        )
    }

    if (!isAuth || !userId || !ADMIN_UIDS.includes(userId)) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/admin')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                User Activity ({stats.total})
                            </h1>
                            <p className="text-gray-400">Logins and page views this {timeframe}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTimeframe('week')}
                                className={`px-4 py-2 rounded-lg transition-colors ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setTimeframe('month')}
                                className={`px-4 py-2 rounded-lg transition-colors ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                This Month
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        All Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('logins')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${activeTab === 'logins' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <LogIn className="h-4 w-4" />
                        Logins
                    </button>
                    <button
                        onClick={() => setActiveTab('views')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${activeTab === 'views' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Eye className="h-4 w-4" />
                        Page Views
                    </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <h3 className="text-sm font-medium text-gray-400">Total Events</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h3 className="text-sm font-medium text-gray-400">Unique Users</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.uniqueUsers}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="h-5 w-5 text-purple-500" />
                            <h3 className="text-sm font-medium text-gray-400">Unique Guests</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.uniqueGuests}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="h-5 w-5 text-orange-500" />
                            <h3 className="text-sm font-medium text-gray-400">Avg Per Day</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {stats.avgPerDay.toFixed(1)}
                        </p>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-6">
                    {sortedDays.length > 0 ? (
                        sortedDays.map((day) => (
                            <div key={day} className="bg-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    {day} ({activityByDay[day].length} event
                                    {activityByDay[day].length !== 1 ? 's' : ''})
                                </h3>
                                <div className="space-y-2">
                                    {activityByDay[day].map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {activity.type === 'login' ? (
                                                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                                                        <LogIn className="h-5 w-5 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                                        <Eye className="h-5 w-5 text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-white font-medium">
                                                        {activity.type === 'login'
                                                            ? 'Login'
                                                            : 'Page View'}
                                                    </h4>
                                                    <p className="text-sm text-gray-400">
                                                        {activity.userEmail || 'Guest'}{' '}
                                                        {activity.page && `• ${activity.page}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-white">
                                                    {new Date(
                                                        activity.timestamp
                                                    ).toLocaleTimeString()}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {activity.userId ? 'Authenticated' : 'Guest'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-gray-800 rounded-xl p-12 text-center">
                            <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No activity yet
                            </h3>
                            <p className="text-gray-400">
                                No {activeTab === 'all' ? 'activity' : activeTab} recorded this{' '}
                                {timeframe}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
