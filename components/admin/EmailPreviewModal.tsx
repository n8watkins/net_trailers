'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import type { EmailTemplate } from './EmailComposer'

interface EmailPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    template: EmailTemplate
    userIds: string[]
    subject?: string
    customMessage?: string
    customHtmlContent?: string
}

type ViewMode = 'desktop' | 'mobile'

export default function EmailPreviewModal({
    isOpen,
    onClose,
    template,
    userIds,
    subject,
    customMessage,
    customHtmlContent,
}: EmailPreviewModalProps) {
    const [loading, setLoading] = useState(false)
    const [html, setHtml] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('desktop')
    const [previewUser, setPreviewUser] = useState<{
        userId: string
        displayName: string
        email: string
    } | null>(null)

    const { showError } = useToast()

    useEffect(() => {
        if (isOpen && userIds.length > 0) {
            loadPreview()
        }
    }, [isOpen, template, userIds, subject, customMessage, customHtmlContent])

    const loadPreview = async () => {
        setLoading(true)
        try {
            // Use first selected user for preview
            const targetUserId = userIds[0]

            const response = await fetch('/api/admin/email/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    template,
                    userId: targetUserId,
                    subject,
                    customMessage,
                    customHtmlContent,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate preview')
            }

            setHtml(result.html)
            setPreviewUser(result.previewUser)
        } catch (error) {
            console.error('Failed to load preview:', error)
            showError(error instanceof Error ? error.message : 'Failed to load preview')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const iframeWidth = viewMode === 'desktop' ? '100%' : '375px'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-gray-900 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-700 p-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">Email Preview</h2>
                        {previewUser && (
                            <p className="mt-1 text-sm text-gray-400">
                                Previewing as: {previewUser.displayName} ({previewUser.email})
                            </p>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                                viewMode === 'desktop'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                            }`}
                        >
                            <ComputerDesktopIcon className="h-5 w-5" />
                            Desktop
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                                viewMode === 'mobile'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                            }`}
                        >
                            <DevicePhoneMobileIcon className="h-5 w-5" />
                            Mobile
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="ml-4 rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-750 hover:text-white"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Preview Content */}
                <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-800 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                            <p className="text-gray-400">Generating preview...</p>
                        </div>
                    ) : html ? (
                        <div
                            className="transition-all duration-300"
                            style={{
                                width: iframeWidth,
                                maxWidth: '100%',
                            }}
                        >
                            <iframe
                                srcDoc={html}
                                title="Email Preview"
                                className="h-[600px] w-full rounded-lg border-2 border-gray-700 bg-white shadow-xl"
                                sandbox="allow-same-origin"
                            />
                        </div>
                    ) : (
                        <p className="text-gray-400">No preview available</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-700 p-6">
                    <div className="text-sm text-gray-400">
                        {userIds.length > 1 && (
                            <p>
                                Preview shown for first selected user. Email will be sent to{' '}
                                {userIds.length} user(s).
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-700 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-600"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    )
}
