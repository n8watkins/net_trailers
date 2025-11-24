'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, LinkIcon, ClockIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid'
import {
    ShareableLink,
    ShareExpirationOption,
    SHARE_EXPIRATION_DURATIONS,
} from '../../types/sharing'
import { useToast } from '../../hooks/useToast'
import { useSessionStore } from '../../stores/sessionStore'
import { getAuthHeaders } from '../../utils/auth'

interface ShareModalProps {
    /** Whether modal is open */
    isOpen: boolean

    /** Callback when modal closes */
    onClose: () => void

    /** Collection to share */
    collectionId: string

    /** Collection name */
    collectionName: string
}

/**
 * ShareModal Component
 *
 * Manages share links for a collection:
 * - Create new share links
 * - Copy link to clipboard
 * - Toggle active/inactive
 * - Delete share link
 * - View statistics
 */
export default function ShareModal({
    isOpen,
    onClose,
    collectionId,
    collectionName,
}: ShareModalProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [shareLink, setShareLink] = useState<ShareableLink | null>(null)
    const [expiresIn, setExpiresIn] = useState<ShareExpirationOption>('never')
    const [showOwnerName, setShowOwnerName] = useState(true)
    const [allowDuplicates, setAllowDuplicates] = useState(true)
    const [copied, setCopied] = useState(false)

    const { showSuccess, showError } = useToast()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    // Load existing share for this collection
    useEffect(() => {
        if (isOpen && collectionId && userId) {
            loadExistingShare()
        }
    }, [isOpen, collectionId, userId])

    const loadExistingShare = async () => {
        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders()

            // Get user's shares and find one for this collection
            const response = await fetch('/api/shares/user', {
                headers,
            })

            if (!response.ok) return

            const data = await response.json()
            if (data.success && data.shares) {
                // Find active share for this collection
                const existingShare = data.shares.find(
                    (s: ShareableLink) => s.collectionId === collectionId && s.isActive
                )
                if (existingShare) {
                    setShareLink(existingShare)
                }
            }
        } catch (error) {
            console.error('Error loading existing share:', error)
        }
    }

    const handleCreateShare = async () => {
        if (!userId) {
            showError('Authentication required', 'Please sign in to share collections')
            return
        }

        setIsCreating(true)

        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders({
                'Content-Type': 'application/json',
            })

            const response = await fetch('/api/shares/create', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    collectionId,
                    expiresIn,
                    settings: {
                        showOwnerName,
                        visibility: 'link-only',
                    },
                    allowDuplicates,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setShareLink(data.share)
                showSuccess('Share link created!', 'Your collection is now shareable')
            } else {
                showError('Failed to create share link', data.error)
            }
        } catch (error) {
            console.error('Error creating share:', error)
            showError('Failed to create share link', 'Please try again later')
        } finally {
            setIsCreating(false)
        }
    }

    const handleCopyLink = async () => {
        if (!shareLink) return

        const shareUrl = `${window.location.origin}/shared/${shareLink.id}`

        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            showSuccess('Link copied!', 'Share link copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Error copying to clipboard:', error)
            showError('Failed to copy', 'Please copy the link manually')
        }
    }

    const handleToggleActive = async () => {
        if (!shareLink || !userId) return

        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders({
                'Content-Type': 'application/json',
            })

            const response = await fetch(`/api/shares/${shareLink.id}/toggle`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    isActive: !shareLink.isActive,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setShareLink({ ...shareLink, isActive: !shareLink.isActive })
                showSuccess(
                    shareLink.isActive ? 'Share deactivated' : 'Share activated',
                    shareLink.isActive ? 'Link is now inactive' : 'Link is now active and shareable'
                )
            } else {
                showError('Failed to toggle share status', data.error)
            }
        } catch (error) {
            console.error('Error toggling share:', error)
            showError('Failed to update share', 'Please try again later')
        }
    }

    const handleDeleteShare = async () => {
        if (!shareLink || !userId) return

        if (!confirm('Are you sure you want to delete this share link? This cannot be undone.')) {
            return
        }

        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders()

            const response = await fetch(`/api/shares/${shareLink.id}`, {
                method: 'DELETE',
                headers,
            })

            const data = await response.json()

            if (data.success) {
                setShareLink(null)
                showSuccess('Share link deleted', 'Link has been permanently removed')
            } else {
                showError('Failed to delete share link', data.error)
            }
        } catch (error) {
            console.error('Error deleting share:', error)
            showError('Failed to delete share', 'Please try again later')
        }
    }

    const getExpirationLabel = (option: ShareExpirationOption): string => {
        const labels: Record<ShareExpirationOption, string> = {
            never: 'Never expires',
            '7days': '7 days',
            '30days': '30 days',
            '90days': '90 days',
        }
        return labels[option]
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

    if (!isOpen) return null

    const shareUrl = shareLink ? `${window.location.origin}/shared/${shareLink.id}` : ''

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg rounded-lg bg-[#181818] p-8 shadow-xl mx-4">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-600/20 p-2">
                            <LinkIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Share Collection</h2>
                            <p className="text-sm text-gray-400">{collectionName}</p>
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

                {shareLink ? (
                    /* Existing Share */
                    <div className="space-y-6">
                        {/* Share URL */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Share Link
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 rounded-md bg-[#333] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 py-3 rounded-md font-medium transition flex items-center gap-2 ${
                                        copied
                                            ? 'bg-green-600 text-white'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon className="h-5 w-5" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <DocumentDuplicateIcon className="h-5 w-5" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Share Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <EyeIcon className="h-4 w-4" />
                                    <span className="text-sm">Views</span>
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    {shareLink.viewCount}
                                </p>
                            </div>
                            <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <ClockIcon className="h-4 w-4" />
                                    <span className="text-sm">Expires</span>
                                </div>
                                <p className="text-sm font-medium text-white">
                                    {formatExpirationDate(shareLink.expiresAt)}
                                </p>
                            </div>
                        </div>

                        {/* Share Status */}
                        <div className="rounded-md bg-[#0a0a0a] border border-[#313131] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-white mb-1">
                                        Link Status
                                    </h4>
                                    <p className="text-xs text-gray-400">
                                        {shareLink.isActive
                                            ? 'Anyone with the link can view'
                                            : 'Link is currently inactive'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleToggleActive}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                                        shareLink.isActive
                                            ? 'bg-red-600/20 text-red-500 hover:bg-red-600/30'
                                            : 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
                                    }`}
                                >
                                    {shareLink.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={handleDeleteShare}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-red-600/20 text-red-500 font-medium hover:bg-red-600/30 transition"
                        >
                            <TrashIcon className="h-5 w-5" />
                            Delete Share Link
                        </button>
                    </div>
                ) : (
                    /* Create New Share */
                    <div className="space-y-6">
                        <p className="text-sm text-gray-400">
                            Create a shareable link for this collection. Anyone with the link will
                            be able to view the contents.
                        </p>

                        {/* Expiration */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Link Expiration
                            </label>
                            <select
                                value={expiresIn}
                                onChange={(e) =>
                                    setExpiresIn(e.target.value as ShareExpirationOption)
                                }
                                className="w-full rounded-md bg-[#333] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                {(
                                    Object.keys(
                                        SHARE_EXPIRATION_DURATIONS
                                    ) as ShareExpirationOption[]
                                ).map((option) => (
                                    <option key={option} value={option}>
                                        {getExpirationLabel(option)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Settings */}
                        <div className="space-y-3">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-white">Show My Name</p>
                                    <p className="text-xs text-gray-400">
                                        Display your name on the shared page
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showOwnerName}
                                    onChange={(e) => setShowOwnerName(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>

                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Allow Duplicates
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Let viewers save this collection to their account
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={allowDuplicates}
                                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleCreateShare}
                            disabled={isCreating}
                            className="w-full px-4 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isCreating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Creating...
                                </span>
                            ) : (
                                'Create Share Link'
                            )}
                        </button>
                    </div>
                )}

                {/* Info */}
                <div className="mt-6 rounded-md bg-blue-600/10 px-4 py-3">
                    <p className="text-xs text-blue-400">
                        <strong>💡 Tip:</strong> Share links can be toggled on/off without deleting
                        them. Deactivate temporarily to prevent access, or delete permanently to
                        revoke the link.
                    </p>
                </div>
            </div>
        </div>
    )
}
