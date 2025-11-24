'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, LinkIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline'
import { ShareableLink, ShareStats } from '../../types/sharing'
import { useToast } from '../../hooks/useToast'
import { useSessionStore } from '../../stores/sessionStore'
import ShareModal from './ShareModal'
import { getAuthHeaders } from '../../utils/auth'

interface ManageSharesModalProps {
    /** Whether modal is open */
    isOpen: boolean

    /** Callback when modal closes */
    onClose: () => void
}

/**
 * ManageSharesModal Component
 *
 * Lists all user's shares with statistics and management options.
 * Opens ShareModal for individual share management.
 */
export default function ManageSharesModal({ isOpen, onClose }: ManageSharesModalProps) {
    const [shares, setShares] = useState<ShareableLink[]>([])
    const [stats, setStats] = useState<ShareStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedShare, setSelectedShare] = useState<{
        id: string
        name: string
    } | null>(null)

    const { showError } = useToast()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    useEffect(() => {
        if (isOpen) {
            loadShares()
        }
    }, [isOpen])

    const loadShares = async () => {
        if (!userId) return

        setIsLoading(true)
        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders()

            const response = await fetch('/api/shares/user', {
                headers,
            })

            const data = await response.json()

            if (data.success) {
                setShares(data.shares || [])
                setStats(data.stats || null)
            } else {
                showError('Failed to load shares', data.error)
            }
        } catch (error) {
            console.error('Error loading shares:', error)
            showError('Failed to load shares', 'Please try again later')
        } finally {
            setIsLoading(false)
        }
    }

    const formatExpirationDate = (timestamp: number | null): string => {
        if (!timestamp) return 'Never'
        const date = new Date(timestamp)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const handleShareClick = (share: ShareableLink) => {
        setSelectedShare({
            id: share.collectionId,
            name: share.collectionName,
        })
    }

    const handleCloseShareModal = () => {
        setSelectedShare(null)
        // Reload shares to reflect changes
        loadShares()
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-modal flex items-center justify-center">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/70" onClick={onClose} />

                {/* Modal */}
                <div className="relative z-10 w-full max-w-4xl rounded-lg bg-[#181818] p-8 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between sticky top-0 bg-[#181818] pb-4 border-b border-[#313131]">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-600/20 p-2">
                                <LinkIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Manage Shares</h2>
                                <p className="text-sm text-gray-400">
                                    View and manage your shared collections
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Statistics */}
                    {stats && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                                <p className="text-sm text-gray-400 mb-1">Total Shares</p>
                                <p className="text-2xl font-bold text-white">{stats.totalShares}</p>
                            </div>
                            <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                                <p className="text-sm text-gray-400 mb-1">Active Links</p>
                                <p className="text-2xl font-bold text-green-500">
                                    {stats.activeShares}
                                </p>
                            </div>
                            <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                                <p className="text-sm text-gray-400 mb-1">Total Views</p>
                                <p className="text-2xl font-bold text-blue-500">
                                    {stats.totalViews}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
                            <p className="text-gray-400">Loading shares...</p>
                        </div>
                    )}

                    {/* Shares list */}
                    {!isLoading && (
                        <>
                            {shares.length === 0 ? (
                                <div className="text-center py-12 rounded-md bg-[#0a0a0a] border border-[#313131]">
                                    <LinkIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 mb-2">No shared collections yet</p>
                                    <p className="text-sm text-gray-500">
                                        Create shareable links from your collections
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {shares.map((share) => (
                                        <div
                                            key={share.id}
                                            onClick={() => handleShareClick(share)}
                                            className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4 hover:bg-[#1a1a1a] hover:border-[#454545] transition cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-semibold text-white">
                                                            {share.collectionName}
                                                        </h3>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                share.isActive
                                                                    ? 'bg-green-600/20 text-green-500'
                                                                    : 'bg-gray-600/20 text-gray-500'
                                                            }`}
                                                        >
                                                            {share.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                                                        <div className="flex items-center gap-1">
                                                            <EyeIcon className="h-4 w-4" />
                                                            <span>{share.viewCount} views</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <ClockIcon className="h-4 w-4" />
                                                            <span>
                                                                Expires:{' '}
                                                                {formatExpirationDate(
                                                                    share.expiresAt
                                                                )}
                                                            </span>
                                                        </div>
                                                        <span>• {share.itemCount} items</span>
                                                    </div>

                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Created{' '}
                                                        {new Date(
                                                            share.createdAt
                                                        ).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <button className="px-4 py-2 rounded-md bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 transition text-sm font-medium">
                                                    Manage
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Help text */}
                    {!isLoading && shares.length > 0 && (
                        <div className="mt-6 rounded-md bg-blue-600/10 px-4 py-3">
                            <p className="text-xs text-blue-400">
                                <strong>💡 Tip:</strong> Click on any share to view details, copy
                                the link, or manage settings. Most viewed:{' '}
                                {stats?.mostViewedShare
                                    ? `"${stats.mostViewedShare.collectionName}" (${stats.mostViewedShare.viewCount} views)`
                                    : 'None yet'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ShareModal for individual share management */}
            {selectedShare && (
                <ShareModal
                    isOpen={!!selectedShare}
                    onClose={handleCloseShareModal}
                    collectionId={selectedShare.id}
                    collectionName={selectedShare.name}
                />
            )}
        </>
    )
}
