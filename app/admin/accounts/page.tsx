'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/stores/sessionStore'
import { ArrowLeft, Search, Filter, Download } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { auth } from '@/firebase'

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

export default function AccountsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isAuth = sessionType === 'authenticated'
    const { showError } = useToast()

    const [users, setUsers] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterProvider, setFilterProvider] = useState<string>('all')
    const [filterVerified, setFilterVerified] = useState<string>('all')

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
            // Get Firebase user and ID token
            const user = auth.currentUser
            if (!user) {
                showError('Authentication required - please refresh the page')
                setLoading(false)
                return
            }

            const idToken = await user.getIdToken()
            if (!idToken) {
                showError('Failed to get authentication token')
                setLoading(false)
                return
            }

            const response = await fetch('/api/admin/users', {
                headers: {
                    Authorization: `Bearer ${idToken}`,
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

    // Filter and search users
    const filteredUsers = users.filter((user) => {
        // Search filter
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase())

        // Provider filter
        const matchesProvider =
            filterProvider === 'all' ||
            user.providerData.some((p) => p.providerId.includes(filterProvider))

        // Verified filter
        const matchesVerified =
            filterVerified === 'all' ||
            (filterVerified === 'verified' && user.emailVerified) ||
            (filterVerified === 'unverified' && !user.emailVerified)

        return matchesSearch && matchesProvider && matchesVerified
    })

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Joined', 'Last Sign In', 'Verified', 'Provider']
        const rows = filteredUsers.map((user) => [
            user.displayName,
            user.email,
            new Date(user.createdAt).toLocaleDateString(),
            new Date(user.lastSignInAt).toLocaleDateString(),
            user.emailVerified ? 'Yes' : 'No',
            user.providerData[0]?.providerId.replace('.com', ''),
        ])

        const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accounts-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

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
                    <h1 className="text-3xl font-bold text-white mb-2">
                        All Accounts ({filteredUsers.length})
                    </h1>
                    <p className="text-gray-400">Manage and view all registered user accounts</p>
                </div>

                {/* Filters and Search */}
                <div className="bg-gray-800 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Provider Filter */}
                        <div>
                            <select
                                value={filterProvider}
                                onChange={(e) => setFilterProvider(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">All Providers</option>
                                <option value="google">Google</option>
                                <option value="password">Email/Password</option>
                            </select>
                        </div>

                        {/* Verified Filter */}
                        <div>
                            <select
                                value={filterVerified}
                                onChange={(e) => setFilterVerified(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="verified">Verified</option>
                                <option value="unverified">Unverified</option>
                            </select>
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Export to CSV
                        </button>
                    </div>
                </div>

                {/* User List */}
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-900">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Joined
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Last Sign In
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Provider
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredUsers.map((user) => (
                                    <tr
                                        key={user.uid}
                                        className="hover:bg-gray-750 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
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
                                                    <div className="text-sm font-medium text-white">
                                                        {user.displayName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-300">
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-300">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(user.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-300">
                                                {new Date(user.lastSignInAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(user.lastSignInAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${user.emailVerified ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}
                                            >
                                                {user.emailVerified ? 'Verified' : 'Unverified'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-300">
                                                {user.providerData[0]?.providerId.replace(
                                                    '.com',
                                                    ''
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-400">No accounts found matching your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
