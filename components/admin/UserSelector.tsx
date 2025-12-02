'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { UserIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import type { EmailTemplate } from './EmailComposer'

interface User {
    userId: string
    email: string
    displayName?: string
    createdAt: number
    lastActive?: number
    emailNotifications?: {
        trending?: boolean
        social?: boolean
    }
}

interface UserSelectorProps {
    selectedUserIds: string[]
    onSelectionChange: (userIds: string[]) => void
    template: EmailTemplate
}

type FilterType = 'all' | 'trending' | 'social' | 'recent' | 'inactive'

export default function UserSelector({
    selectedUserIds,
    onSelectionChange,
    template,
}: UserSelectorProps) {
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')

    const { showError } = useToast()

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        // Auto-select filter based on template
        if (template === 'trending') {
            setSelectedFilter('trending')
        } else if (template === 'social') {
            setSelectedFilter('social')
        } else {
            setSelectedFilter('all')
        }
    }, [template])

    useEffect(() => {
        applyFilters()
    }, [users, searchQuery, selectedFilter])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/users/filtered?filter=all')
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch users')
            }

            setUsers(result.users || [])
        } catch (error) {
            console.error('Failed to fetch users:', error)
            showError(error instanceof Error ? error.message : 'Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = () => {
        let filtered = [...users]

        // Apply filter type
        switch (selectedFilter) {
            case 'trending':
                filtered = filtered.filter((u) => u.emailNotifications?.trending === true)
                break
            case 'social':
                filtered = filtered.filter((u) => u.emailNotifications?.social === true)
                break
            case 'recent': {
                // Active in last 7 days
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                filtered = filtered.filter((u) => (u.lastActive || 0) > sevenDaysAgo)
                break
            }
            case 'inactive': {
                // Not active in last 30 days
                const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
                filtered = filtered.filter((u) => (u.lastActive || 0) < thirtyDaysAgo)
                break
            }
            case 'all':
            default:
                // No filtering
                break
        }

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (u) =>
                    u.email.toLowerCase().includes(query) ||
                    (u.displayName?.toLowerCase() || '').includes(query) ||
                    u.userId.toLowerCase().includes(query)
            )
        }

        setFilteredUsers(filtered)
    }

    const handleSelectAll = () => {
        if (selectedUserIds.length === filteredUsers.length) {
            // Deselect all
            onSelectionChange([])
        } else {
            // Select all filtered users
            onSelectionChange(filteredUsers.map((u) => u.userId))
        }
    }

    const handleToggleUser = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            onSelectionChange(selectedUserIds.filter((id) => id !== userId))
        } else {
            onSelectionChange([...selectedUserIds, userId])
        }
    }

    const filters = [
        { id: 'all' as FilterType, label: 'All Users', count: users.length },
        {
            id: 'trending' as FilterType,
            label: 'Trending Opt-in',
            count: users.filter((u) => u.emailNotifications?.trending === true).length,
        },
        {
            id: 'social' as FilterType,
            label: 'Social Opt-in',
            count: users.filter((u) => u.emailNotifications?.social === true).length,
        },
        {
            id: 'recent' as FilterType,
            label: 'Recently Active',
            count: users.filter(
                (u) => (u.lastActive || 0) > Date.now() - 7 * 24 * 60 * 60 * 1000
            ).length,
        },
        {
            id: 'inactive' as FilterType,
            label: 'Inactive (30d+)',
            count: users.filter(
                (u) => (u.lastActive || 0) < Date.now() - 30 * 24 * 60 * 60 * 1000
            ).length,
        },
    ]

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
                    disabled={loading || filteredUsers.length === 0}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {selectedUserIds.length === filteredUsers.length
                        ? 'Deselect All'
                        : 'Select All'}
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
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        disabled={loading}
                        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedFilter === filter.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {filter.label}{' '}
                        <span className="ml-1 opacity-60">({filter.count})</span>
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
                                className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-gray-750"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUserIds.includes(user.userId)}
                                    onChange={() => handleToggleUser(user.userId)}
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-white">
                                        {user.displayName || 'Anonymous User'}
                                    </div>
                                    <div className="text-sm text-gray-400">{user.email}</div>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {user.emailNotifications?.trending && (
                                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                                Trending ✓
                                            </span>
                                        )}
                                        {user.emailNotifications?.social && (
                                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                                                Social ✓
                                            </span>
                                        )}
                                        {user.lastActive && (
                                            <span className="text-xs text-gray-500">
                                                Last active:{' '}
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
            {filteredUsers.length > 0 && (
                <div className="text-sm text-gray-400">
                    Showing {filteredUsers.length} of {users.length} total users
                </div>
            )}
        </div>
    )
}
