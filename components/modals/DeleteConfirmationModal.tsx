'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Z_INDEX } from '../../constants/zIndex'

interface DeleteConfirmationModalProps {
    /** Whether the modal is open */
    isOpen: boolean
    /** Called when the modal should close (cancel or backdrop click) */
    onClose: () => void
    /** Called when deletion is confirmed. Modal waits for this to resolve before closing. */
    onConfirm: () => void | Promise<void>
    /** The name/title of the item being deleted (used for confirmation input) */
    itemName: string
    /** Optional emoji to display with the item name */
    emoji?: string
    /** Whether this is a system item (changes warning message) */
    isSystemItem?: boolean
    /** Custom title for the modal (default: "Delete Collection?") */
    title?: string
    /** Custom warning message (overrides default based on isSystemItem) */
    warningMessage?: string
    /** Z-index layer to use (default: MODAL_DELETE for standalone, MODAL_EDITOR_DELETE for nested) */
    zIndexLayer?: 'MODAL_DELETE' | 'MODAL_EDITOR_DELETE'
}

/**
 * DeleteConfirmationModal Component
 *
 * A reusable modal for confirming destructive actions with a type-to-confirm pattern.
 * Features:
 * - Type-to-confirm: User must type the exact item name to enable deletion
 * - Copy button: Easy copying of item name for pasting
 * - Accessible: ARIA attributes, focus management, escape key handler
 * - Portal: Renders outside normal DOM hierarchy
 *
 * @example
 * <DeleteConfirmationModal
 *     isOpen={showDeleteModal}
 *     onClose={() => setShowDeleteModal(false)}
 *     onConfirm={handleDelete}
 *     itemName={collection.name}
 *     emoji={collection.emoji}
 * />
 */
export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    emoji,
    isSystemItem = false,
    title = 'Delete Collection?',
    warningMessage,
    zIndexLayer = 'MODAL_DELETE',
}: DeleteConfirmationModalProps) {
    const [confirmation, setConfirmation] = useState('')
    const [copied, setCopied] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)
    const mouseDownTargetRef = useRef<EventTarget | null>(null)

    const isDeleteEnabled = confirmation === itemName && !isDeleting
    const zIndex = Z_INDEX[zIndexLayer]

    // Default warning messages
    const defaultWarning = isSystemItem
        ? 'This is a system collection. You can restore it later with "Reset Defaults".'
        : 'This action cannot be undone. This will permanently delete your collection.'

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setConfirmation('')
            setCopied(false)
            setIsDeleting(false)
        }
    }, [isOpen])

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small delay to ensure modal is rendered
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = originalOverflow
            }
        }
    }, [isOpen])

    const handleCopyTitle = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(itemName)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
        }
    }, [itemName])

    const handleConfirm = useCallback(async () => {
        if (!isDeleteEnabled) return

        setIsDeleting(true)
        try {
            await onConfirm()
            onClose()
        } catch (error) {
            // Error handling is done by the caller, just reset deleting state
            console.error('Delete failed:', error)
        } finally {
            setIsDeleting(false)
        }
    }, [isDeleteEnabled, onConfirm, onClose])

    // Handle mousedown to track where click started
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownTargetRef.current = e.target
    }, [])

    // Only close if both mousedown and mouseup happened on the backdrop
    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.target) {
                onClose()
            }
            mouseDownTargetRef.current = null
        },
        [onClose]
    )

    // Handle Enter key in input
    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && isDeleteEnabled) {
                e.preventDefault()
                handleConfirm()
            }
        },
        [isDeleteEnabled, handleConfirm]
    )

    if (!isOpen) return null

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
        >
            <div
                ref={modalRef}
                className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                {/* Title */}
                <h3 id="delete-modal-title" className="text-xl font-bold text-white mb-4">
                    {title}
                </h3>

                {/* Item Name Display */}
                <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">
                        {isSystemItem ? 'System collection:' : 'Collection to delete:'}
                    </p>
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-3">
                        {emoji && <span className="text-xl">{emoji}</span>}
                        <span className="text-white font-semibold flex-1 truncate">{itemName}</span>
                        <button
                            onClick={handleCopyTitle}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors shrink-0"
                            title="Copy name"
                            aria-label="Copy collection name to clipboard"
                        >
                            {copied ? (
                                <CheckIcon className="w-4 h-4 text-green-400" />
                            ) : (
                                <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Warning Message */}
                <p id="delete-modal-description" className="text-gray-300 mb-4 text-sm">
                    {warningMessage || defaultWarning}
                </p>

                {/* Confirmation Input */}
                <div className="mb-6">
                    <label
                        htmlFor="delete-confirmation-input"
                        className="block text-sm text-gray-400 mb-2"
                    >
                        Type <span className="text-white font-semibold">{itemName}</span> to
                        confirm:
                    </label>
                    <input
                        ref={inputRef}
                        id="delete-confirmation-input"
                        type="text"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Enter collection name"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={!isDeleteEnabled || isDeleting}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isDeleteEnabled && !isDeleting
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        aria-disabled={!isDeleteEnabled || isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isDeleting
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )

    // Use portal to render outside normal DOM hierarchy
    if (typeof window === 'undefined') return null
    return createPortal(modalContent, document.body)
}

export default DeleteConfirmationModal
