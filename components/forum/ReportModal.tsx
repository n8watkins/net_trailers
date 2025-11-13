/**
 * Report Modal Component
 *
 * Allows users to report inappropriate content (threads, replies, polls)
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, FlagIcon } from '@heroicons/react/24/outline'
import { ReportReason, ReportContentType } from '@/types/forum'

interface ReportModalProps {
    isOpen: boolean
    onClose: () => void
    contentId: string
    contentType: ReportContentType
    onReport: (reason: ReportReason, details: string) => Promise<void>
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    {
        value: 'spam',
        label: 'Spam',
        description: 'Repetitive, commercial, or off-topic content',
    },
    {
        value: 'harassment',
        label: 'Harassment',
        description: 'Bullying, threats, or targeted attacks',
    },
    {
        value: 'inappropriate',
        label: 'Inappropriate Content',
        description: 'Adult content, violence, or offensive material',
    },
    {
        value: 'misinformation',
        label: 'Misinformation',
        description: 'False or misleading information',
    },
    {
        value: 'off-topic',
        label: 'Off-Topic',
        description: "Content that doesn't belong in this category",
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Other issues not listed above',
    },
]

export function ReportModal({
    isOpen,
    onClose,
    contentId,
    contentType,
    onReport,
}: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
    const [details, setDetails] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedReason) return

        setIsSubmitting(true)
        try {
            await onReport(selectedReason, details)
            setSubmitted(true)
            setTimeout(() => {
                handleClose()
            }, 2000)
        } catch (error) {
            console.error('Failed to submit report:', error)
            alert('Failed to submit report. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setSelectedReason(null)
        setDetails('')
        setSubmitted(false)
        onClose()
    }

    if (!isOpen) return null

    const contentTypeLabel =
        contentType === 'thread' ? 'thread' : contentType === 'reply' ? 'reply' : 'poll'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <FlagIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-bold text-white">Report {contentTypeLabel}</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {submitted ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                            <FlagIcon className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Report Submitted</h3>
                        <p className="text-gray-400">
                            Thank you for helping keep our community safe. We'll review your report
                            shortly.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Reason selection */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-3">
                                Why are you reporting this {contentTypeLabel}? *
                            </label>
                            <div className="space-y-2">
                                {REPORT_REASONS.map((reason) => (
                                    <button
                                        key={reason.value}
                                        type="button"
                                        onClick={() => setSelectedReason(reason.value)}
                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                            selectedReason === reason.value
                                                ? 'border-red-500 bg-red-500/10'
                                                : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <div className="font-semibold text-white mb-1">
                                            {reason.label}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {reason.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Additional details */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Additional details (optional)
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Provide any additional context that might help us understand the issue..."
                                rows={4}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                maxLength={500}
                            />
                            <div className="mt-1 text-xs text-gray-500 text-right">
                                {details.length}/500
                            </div>
                        </div>

                        {/* Notice */}
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                            <p className="text-sm text-gray-400">
                                <strong className="text-white">Note:</strong> False reports may
                                result in action against your account. Please only report content
                                that violates our community guidelines.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!selectedReason || isSubmitting}
                                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
