'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react'
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

// Admin UIDs
const ADMIN_UIDS = [process.env.NEXT_PUBLIC_ADMIN_UID || 'YOUR_FIREBASE_UID_HERE']

export default function SignupsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isAuth = sessionType === 'authenticated'
    const { showError } = useToast()

    const [users, setUsers] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<'week' | 'month'>('month')

    // Auth check
    useEffect(() => {
        if (!isInitialized) return
        if (!isAuth || !userId || !ADMIN_UIDS.includes(userId)) {
            router.push('/')
        }
    }, [isAuth, userId, isInitialized, router])

    // Load users
    useEffect(() => {
        if (isAuth && userId && ADMIN_UIDS.includes(userId)) {
            loadUsers()
        }
    }, [isAuth, userId])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setUsers(data.users)
            } else {
                showError('Failed to load users')
            }
        } catch (error) {
            showError('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    // Calculate timeframe boundaries
    const getTimeframeBoundary = () => {
        const now = new Date()
        if (timeframe === 'week') {
            const day = now.getUTCDay()
            const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
            const monday = new Date(now)
            monday.setUTCDate(diff)
            monday.setUTCHours(0, 0, 0, 0)
            return monday.getTime()
        } else {
            const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
            monthStart.setUTCHours(0, 0, 0, 0)
            return monthStart.getTime()
        }
    }

    // Filter users by timeframe
    const recentSignups = users.filter((user) => {
        const signupTime = new Date(user.createdAt).getTime()
        return signupTime >= getTimeframeBoundary()
    })

    // Group by day
    const signupsByDay = recentSignups.reduce(
        (acc, user) => {
            const day = new Date(user.createdAt).toLocaleDateString()
            if (!acc[day]) {
                acc[day] = []
            }
            acc[day].push(user)
            return acc
        },
        {} as Record<string, UserInfo[]>
    )

    const sortedDays = Object.keys(signupsByDay).sort(
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
                                Recent Signups ({recentSignups.length})
                            </h1>
                            <p className="text-gray-400">New accounts created this {timeframe}</p>
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

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <h3 className="text-sm font-medium text-gray-400">Total Signups</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{recentSignups.length}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <h3 className="text-sm font-medium text-gray-400">Active Days</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{sortedDays.length}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="h-5 w-5 text-purple-500" />
                            <h3 className="text-sm font-medium text-gray-400">Avg Per Day</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {sortedDays.length > 0
                                ? (recentSignups.length / sortedDays.length).toFixed(1)
                                : '0'}
                        </p>
                    </div>
                </div>

                {/* Signups Timeline */}
                <div className="space-y-6">
                    {sortedDays.length > 0 ? (
                        sortedDays.map((day) => (
                            <div key={day} className="bg-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    {day} ({signupsByDay[day].length} signup
                                    {signupsByDay[day].length !== 1 ? 's' : ''})
                                </h3>
                                <div className="space-y-3">
                                    {signupsByDay[day].map((user) => (
                                        <div
                                            key={user.uid}
                                            className="flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {user.photoURL ? (
                                                    <img
                                                        src={user.photoURL}
                                                        alt={user.displayName}
                                                        className="h-10 w-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                                        {user.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-white font-medium">
                                                        {user.displayName}
                                                    </h4>
                                                    <p className="text-sm text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-white">
                                                    {new Date(user.createdAt).toLocaleTimeString()}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded ${user.emailVerified ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}
                                                    >
                                                        {user.emailVerified
                                                            ? 'Verified'
                                                            : 'Unverified'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        via{' '}
                                                        {user.providerData[0]?.providerId.replace(
                                                            '.com',
                                                            ''
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-gray-800 rounded-xl p-12 text-center">
                            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No signups yet
                            </h3>
                            <p className="text-gray-400">
                                No new accounts created this {timeframe}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
