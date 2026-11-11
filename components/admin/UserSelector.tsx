'use client'

import { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import { UserIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface User {
    userId: string
    email: string
    displayName: string | null
    createdAt: number | null
    lastActive: number | null
    /** False when email is off for this user, including after unsubscribing. */
    canReceiveEmail: boolean
    emailNotifications: {
        trending: boolean
        social: boolean
    }
}

interface UserSelectorProps {
    selectedUserIds: string[]
    onSelectionChange: (userIds: string[]) => void
}

type FilterType = 'all' | 'trending' | 'social' | 'recent' | 'inactive'

const DAY = 24 * 60 * 60 * 1000

function matchesFilter(user: User, filter: FilterType, now: number): boolean {
    switch (filter) {
        case 'trending':
            return user.canReceiveEmail && user.emailNotifications.trending
        case 'social':
            return user.canReceiveEmail && user.emailNotifications.social
        case 'recent':
            return (user.lastActive ?? 0) > now - 7 * DAY
        case 'inactive':
            return (user.lastActive ?? 0) < now - 30 * DAY
        default:
            return true
    }
}

const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All Users' },
    { id: 'trending', label: 'Trending Opt-in' },
    { id: 'social', label: 'Social Opt-in' },
    { id: 'recent', label: 'Recently Active' },
    { id: 'inactive', label: 'Inactive (30d+)' },
]

export default function UserSelector({ selectedUserIds, onSelectionChange }: UserSelectorProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')

    const { showError } = useToast()

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/admin/users/filtered?filter=all')
                const result = await response.json()
                if (!response.ok) throw new Error(result.error || 'Failed to fetch users')
                setUsers(result.users || [])
            } catch (error) {
                showError(error instanceof Error ? error.message : 'Failed to fetch users')
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    const filterCounts = useMemo(() => {
        const now = Date.now()
        return Object.fromEntries(
            FILTERS.map((f) => [f.id, users.filter((u) => matchesFilter(u, f.id, now)).length])
        ) as Record<FilterType, number>
    }, [users])

    const filteredUsers = useMemo(() => {
        const now = Date.now()
        const query = searchQuery.toLowerCase()
        return users.filter(
            (u) =>
                matchesFilter(u, selectedFilter, now) &&
                (!query ||
                    u.email.toLowerCase().includes(query) ||
                    (u.displayName?.toLowerCase() ?? '').includes(query) ||
                    u.userId.toLowerCase().includes(query))
        )
    }, [users, searchQuery, selectedFilter])

    // Only users who can get email can be selected.
    const selectable = filteredUsers.filter((u) => u.canReceiveEmail)
    const allSelected =
        selectable.length > 0 && selectable.every((u) => selectedUserIds.includes(u.userId))
    const optedOutCount = users.filter((u) => !u.canReceiveEmail).length

    const handleSelectAll = () => {
        onSelectionChange(allSelected ? [] : selectable.map((u) => u.userId))
    }

    const handleToggleUser = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            onSelectionChange(selectedUserIds.filter((id) => id !== userId))
        } else {
            onSelectionChange([...selectedUserIds, userId])
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Select Recipients</h3>
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                        {selectedUserIds.length} selected
                    </span>
                </div>
                <button
                    onClick={handleSelectAll}
                    disabled={loading || selectable.length === 0}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {allSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email, name, or user ID..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <FunnelIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                {FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        disabled={loading}
                        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedFilter === filter.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {filter.label}{' '}
                        <span className="ml-1 opacity-60">({filterCounts[filter.id]})</span>
                    </button>
                ))}
            </div>

            {/* User List */}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                        {searchQuery
                            ? 'No users found matching your search'
                            : 'No users found with this filter'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {filteredUsers.map((user) => (
                            <label
                                key={user.userId}
                                className={`flex items-center gap-3 p-4 transition-colors ${
                                    user.canReceiveEmail
                                        ? 'cursor-pointer hover:bg-gray-700/50'
                                        : 'cursor-not-allowed opacity-60'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    aria-label={user.email}
                                    disabled={!user.canReceiveEmail}
                                    checked={
                                        user.canReceiveEmail &&
                                        selectedUserIds.includes(user.userId)
                                    }
                                    onChange={() => handleToggleUser(user.userId)}
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0"
                                />
                                <div className="flex-1">
                                    {user.displayName && (
                                        <div className="font-medium text-white">
                                            {user.displayName}
                                        </div>
                                    )}
                                    <div
                                        className={
                                            user.displayName
                                                ? 'text-sm text-gray-400'
                                                : 'font-medium text-white'
                                        }
                                    >
                                        {user.email}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {!user.canReceiveEmail && (
                                            <span className="rounded-full bg-gray-600/40 px-2 py-0.5 text-xs text-gray-300">
                                                Email off
                                            </span>
                                        )}
                                        {user.canReceiveEmail &&
                                            user.emailNotifications.trending && (
                                                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                                    Trending ✓
                                                </span>
                                            )}
                                        {user.canReceiveEmail && user.emailNotifications.social && (
                                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                                                Social ✓
                                            </span>
                                        )}
                                        {user.lastActive !== null && user.lastActive > 0 && (
                                            <span className="text-xs text-gray-500">
                                                Last sign-in:{' '}
                                                {new Date(user.lastActive).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary */}
            {users.length > 0 && (
                <div className="text-sm text-gray-400">
                    Showing {filteredUsers.length} of {users.length} total users
                    {optedOutCount > 0 &&
                        `. ${optedOutCount} with email off (or unsubscribed) cannot be selected.`}
                </div>
            )}
        </div>
    )
}
