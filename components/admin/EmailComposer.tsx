'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import UserSelector from './UserSelector'
import EmailPreviewModal from './EmailPreviewModal'
import RichTextEditor from './RichTextEditor'
import { EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

export type EmailTemplate = 'trending' | 'social' | 'announcement' | 'custom'

export default function EmailComposer() {
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('trending')
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [subject, setSubject] = useState('')
    const [customMessage, setCustomMessage] = useState('')
    const [customHtmlContent, setCustomHtmlContent] = useState('')
    const [sending, setSending] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const { showSuccess, showError } = useToast()

    const templates = [
        {
            id: 'trending' as EmailTemplate,
            name: 'Trending Content',
            description: 'Weekly trending movies and TV shows from watchlists',
            icon: '📈',
        },
        {
            id: 'social' as EmailTemplate,
            name: 'Social Digest',
            description: 'Batched comments and likes on rankings',
            icon: '💬',
        },
        {
            id: 'announcement' as EmailTemplate,
            name: 'Announcement',
            description: 'System announcements or important updates',
            icon: '📢',
        },
        {
            id: 'custom' as EmailTemplate,
            name: 'Custom Email',
            description: 'Fully custom email with rich text editor',
            icon: '✉️',
        },
    ]

    const handleSendEmail = async () => {
        if (selectedUserIds.length === 0) {
            showError('Please select at least one user')
            return
        }

        if (selectedTemplate === 'announcement' && !subject) {
            showError('Please enter a subject for the announcement')
            return
        }

        if (selectedTemplate === 'announcement' && !customMessage) {
            showError('Please enter a message for the announcement')
            return
        }

        if (selectedTemplate === 'custom' && (!subject || !customHtmlContent)) {
            showError('Please enter a subject and message for custom emails')
            return
        }

        setSending(true)

        try {
            const response = await fetch('/api/admin/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    template: selectedTemplate,
                    userIds: selectedUserIds,
                    subject: subject || undefined,
                    customMessage: customMessage || undefined,
                    customHtmlContent: customHtmlContent || undefined,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send emails')
            }

            showSuccess(
                `Successfully sent ${result.emailsSent} email(s) to ${selectedUserIds.length} user(s)`
            )

            // Reset form
            setSelectedUserIds([])
            setSubject('')
            setCustomMessage('')
        } catch (error) {
            console.error('Failed to send emails:', error)
            showError(error instanceof Error ? error.message : 'Failed to send emails')
        } finally {
            setSending(false)
        }
    }

    const handlePreview = () => {
        if (selectedUserIds.length > 0) {
            setShowPreview(true)
        }
    }

    const showSubjectField = selectedTemplate === 'announcement' || selectedTemplate === 'custom'

    return (
        <>
            <EmailPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                template={selectedTemplate}
                userIds={selectedUserIds}
                subject={subject}
                customMessage={customMessage}
                customHtmlContent={customHtmlContent}
            />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-8 w-8 text-blue-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Email Composer</h2>
                        <p className="text-sm text-gray-400">
                            Send emails to users manually with template selection
                        </p>
                    </div>
                </div>

                {/* Template Selection */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                        Select Email Template
                    </label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template.id)}
                                className={`rounded-lg border-2 p-4 text-left transition-all ${
                                    selectedTemplate === template.id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{template.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">
                                            {template.name}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {template.description}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subject Field (for announcements and custom) */}
                {showSubjectField && (
                    <div>
                        <label
                            htmlFor="subject"
                            className="mb-2 block text-sm font-medium text-gray-300"
                        >
                            Email Subject
                        </label>
                        <input
                            id="subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter email subject..."
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                )}

                {/* Announcement Message Field (plain textarea) */}
                {selectedTemplate === 'announcement' && (
                    <div>
                        <label
                            htmlFor="message"
                            className="mb-2 block text-sm font-medium text-gray-300"
                        >
                            Announcement Message
                        </label>
                        <textarea
                            id="message"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Enter your announcement message..."
                            rows={6}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                )}

                {/* Custom Email Rich Text Editor */}
                {selectedTemplate === 'custom' && (
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Custom Message (Rich Text)
                        </label>
                        <RichTextEditor
                            value={customHtmlContent}
                            onChange={setCustomHtmlContent}
                            placeholder="Write your custom email message with rich formatting..."
                        />
                    </div>
                )}

                {/* User Selection */}
                <UserSelector
                    selectedUserIds={selectedUserIds}
                    onSelectionChange={setSelectedUserIds}
                    template={selectedTemplate}
                />

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handlePreview}
                        disabled={selectedUserIds.length === 0 || sending}
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 font-semibold text-white transition-colors hover:border-gray-600 hover:bg-gray-750 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Preview Email
                    </button>
                    <button
                        onClick={handleSendEmail}
                        disabled={selectedUserIds.length === 0 || sending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? (
                            <>
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="h-5 w-5" />
                                Send to {selectedUserIds.length} User(s)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}
