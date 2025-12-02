'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { getTemplateEmoji, getTemplateName } from '@/lib/email/email-templates-config'
import { ClockIcon, CheckCircleIcon, XCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { auth } from '@/firebase'

interface EmailHistoryRecord {
    id: string
    template: string
    subject: string
    recipientCount: number
    successCount: number
    failureCount: number
    sentAt: number
    sentBy: string
}

export default function EmailHistory() {
    const [history, setHistory] = useState<EmailHistoryRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { showError } = useToast()

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        setLoading(true)
        try {
            const user = auth.currentUser
            if (!user) {
                showError('Authentication required')
                return
            }

            const idToken = await user.getIdToken()

            const response = await fetch('/api/admin/email/history', {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load email history')
            }

            setHistory(result.history || [])
        } catch (error) {
            console.error('Failed to load email history:', error)
            showError(error instanceof Error ? error.message : 'Failed to load email history')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ClockIcon className="h-8 w-8 text-purple-500" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Email History</h2>
                    <p className="text-sm text-gray-400">
                        View all emails sent from the admin panel
                    </p>
                </div>
            </div>

            {/* History List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                </div>
            ) : history.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 p-12 text-center">
                    <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-white">No emails sent yet</h3>
                    <p className="mt-2 text-sm text-gray-400">
                        Email history will appear here after you send your first email
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map((record) => (
                        <div
                            key={record.id}
                            className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-gray-600"
                        >
                            <button
                                onClick={() =>
                                    setExpandedId(expandedId === record.id ? null : record.id)
                                }
                                className="w-full p-4 text-left transition-colors hover:bg-gray-750"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-1 items-start gap-3">
                                        <span className="text-3xl">
                                            {getTemplateEmoji(record.template)}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white">
                                                    {record.subject}
                                                </h3>
                                                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                                                    {getTemplateName(record.template)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                                                <span>
                                                    {new Date(record.sentAt).toLocaleString()}
                                                </span>
                                                <span>•</span>
                                                <span>{record.recipientCount} recipients</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex flex-col items-end gap-2">
                                        {record.successCount > 0 && (
                                            <div className="flex items-center gap-1 text-sm text-green-400">
                                                <CheckCircleIcon className="h-4 w-4" />
                                                <span>{record.successCount} sent</span>
                                            </div>
                                        )}
                                        {record.failureCount > 0 && (
                                            <div className="flex items-center gap-1 text-sm text-red-400">
                                                <XCircleIcon className="h-4 w-4" />
                                                <span>{record.failureCount} failed</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* Expanded Details */}
                            {expandedId === record.id && (
                                <div className="border-t border-gray-700 bg-gray-850 p-4">
                                    <div className="text-sm text-gray-300">
                                        <p>
                                            <span className="font-medium text-white">Sent at:</span>{' '}
                                            {new Date(record.sentAt).toLocaleString()}
                                        </p>
                                        <p className="mt-2">
                                            <span className="font-medium text-white">
                                                Template:
                                            </span>{' '}
                                            {getTemplateName(record.template)}
                                        </p>
                                        <p className="mt-2">
                                            <span className="font-medium text-white">Success:</span>{' '}
                                            {record.successCount} / {record.recipientCount}
                                        </p>
                                        {record.failureCount > 0 && (
                                            <p className="mt-2 text-red-400">
                                                <span className="font-medium">Failures:</span>{' '}
                                                {record.failureCount}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
