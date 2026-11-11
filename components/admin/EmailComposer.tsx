'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { adminPost, ConfirmDialog, useReauthDialog } from './AdminDialogs'
import UserSelector from './UserSelector'
import EmailPreviewModal from './EmailPreviewModal'
import RichTextEditor from './RichTextEditor'
import { EMAIL_TEMPLATES } from '@/lib/email/email-templates-config'
import { EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

export type EmailTemplate = 'announcement' | 'custom'

type RecipientPreview = {
    count: number
    sample: string[]
    skippedOptedOut: number
    notFound: number
}

type SendResult = {
    emailsSent: number
    failed?: number
    skippedOptedOut?: number
    stoppedByLimit?: boolean
    error?: string
}

export default function EmailComposer({ onSent }: { onSent?: () => void }) {
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('announcement')
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [subject, setSubject] = useState('')
    const [customMessage, setCustomMessage] = useState('')
    const [customHtmlContent, setCustomHtmlContent] = useState('')
    const [sending, setSending] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [confirm, setConfirm] = useState<RecipientPreview | null>(null)
    const [selectorKey, setSelectorKey] = useState(0)

    const { showSuccess, showError } = useToast()
    const { needReauth, dialog: reauthDialog } = useReauthDialog()

    /** The composed email, or null (with a toast) when it is incomplete. */
    const composed = () => {
        if (!subject.trim()) {
            showError('Please enter a subject')
            return null
        }
        if (selectedTemplate === 'announcement' && !customMessage.trim()) {
            showError('Please enter a message for the announcement')
            return null
        }
        if (selectedTemplate === 'custom' && !customHtmlContent.trim()) {
            showError('Please enter a message for the custom email')
            return null
        }
        return {
            template: selectedTemplate,
            subject,
            ...(selectedTemplate === 'announcement' ? { customMessage } : { customHtmlContent }),
        }
    }

    const failed = (result: { reauth: boolean; error: string }) => {
        if (result.reauth) needReauth()
        else showError(result.error)
    }

    // Step 1: ask the server who would get it, and confirm.
    const handleSendEmail = async () => {
        if (selectedUserIds.length === 0) {
            showError('Please select at least one user')
            return
        }
        if (!composed()) return
        setSending(true)
        const result = await adminPost<RecipientPreview>('/api/admin/email/recipients', {
            userIds: selectedUserIds,
        })
        setSending(false)
        if (!result.ok) return failed(result)
        if (result.data.count === 0) {
            showError('None of the selected users can get email (email off or unsubscribed)')
            return
        }
        setConfirm(result.data)
    }

    // Step 2: the confirmed send.
    const confirmSend = async () => {
        const email = composed()
        if (!email) return
        setSending(true)
        const result = await adminPost<SendResult>('/api/admin/email/send', {
            mode: 'send',
            userIds: selectedUserIds,
            ...email,
        })
        setSending(false)
        setConfirm(null)
        if (!result.ok) return failed(result)
        const { emailsSent, failed: failedCount = 0, skippedOptedOut = 0 } = result.data
        const notes = [
            failedCount ? `${failedCount} failed` : '',
            skippedOptedOut ? `${skippedOptedOut} skipped (email off)` : '',
            result.data.stoppedByLimit ? 'stopped at the email limit' : '',
        ].filter(Boolean)
        showSuccess(`Sent ${emailsSent} email(s)${notes.length ? `; ${notes.join(', ')}` : ''}`)
        setSelectedUserIds([])
        setSubject('')
        setCustomMessage('')
        setCustomHtmlContent('')
        setSelectorKey((key) => key + 1)
        onSent?.()
    }

    const handleSendTest = async () => {
        const email = composed()
        if (!email) return
        setSending(true)
        const result = await adminPost<SendResult>('/api/admin/email/send', {
            mode: 'test',
            ...email,
        })
        setSending(false)
        if (!result.ok) return failed(result)
        if (result.data.emailsSent === 1) showSuccess('Test email sent to you')
        else showError(result.data.error ?? 'The test email failed')
        onSent?.()
    }

    const handlePreview = () => {
        if (selectedUserIds.length > 0) {
            setShowPreview(true)
        }
    }

    return (
        <>
            {reauthDialog}
            {confirm && (
                <ConfirmDialog
                    title={`Send to ${confirm.count} ${confirm.count === 1 ? 'person' : 'people'}?`}
                    confirmLabel={`Send to ${confirm.count}`}
                    danger
                    busy={sending}
                    onConfirm={confirmSend}
                    onCancel={() => setConfirm(null)}
                >
                    <p>
                        Subject: <span className="text-white">{subject}</span>
                    </p>
                    <p>Recipients:</p>
                    <ul
                        className="list-inside list-disc text-gray-400"
                        data-testid="confirm-sample"
                    >
                        {confirm.sample.map((address) => (
                            <li key={address}>{address}</li>
                        ))}
                        {confirm.count > confirm.sample.length && (
                            <li>and {confirm.count - confirm.sample.length} more</li>
                        )}
                    </ul>
                    {confirm.skippedOptedOut > 0 && (
                        <p className="text-amber-400">
                            {confirm.skippedOptedOut} selected{' '}
                            {confirm.skippedOptedOut === 1 ? 'user has' : 'users have'} email off
                            and will be skipped.
                        </p>
                    )}
                </ConfirmDialog>
            )}
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
                        {EMAIL_TEMPLATES.map((template) => (
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

                {/* Subject Field */}
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
                    key={selectorKey}
                    selectedUserIds={selectedUserIds}
                    onSelectionChange={setSelectedUserIds}
                />

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handlePreview}
                        disabled={selectedUserIds.length === 0 || sending}
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 font-semibold text-white transition-colors hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Preview Email
                    </button>
                    <button
                        onClick={handleSendTest}
                        disabled={sending}
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 font-semibold text-white transition-colors hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send a test to me
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
                                Send to {selectedUserIds.length} User(s)...
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}
