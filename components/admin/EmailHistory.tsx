'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { getTemplateEmoji, getTemplateName } from '@/lib/email/email-templates-config'
import {
    CircleCheck as CheckCircleIcon,
    CircleX as XCircleIcon,
    Mail as EnvelopeIcon,
} from 'lucide-react'

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
            // Session cookie sent automatically - no Authorization header needed
            const response = await fetch('/api/admin/email/history')

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
        <div className="space-y-3">
            {/* History List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                </div>
            ) : history.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-white/10 bg-black/30 p-12 text-center">
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
                            className="overflow-hidden rounded-lg border border-white/10 bg-black/30 transition-all hover:border-gray-600"
                        >
                            <button
                                onClick={() =>
                                    setExpandedId(expandedId === record.id ? null : record.id)
                                }
                                className="w-full p-4 text-left transition-colors hover:bg-white/10"
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
                                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">
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
                                <div className="border-t border-white/10 bg-black/40 p-4">
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
                                            <p className="mt-2 text-amber-300">
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
