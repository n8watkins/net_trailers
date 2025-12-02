'use client'

import { useState } from 'react'
import {
    Clock,
    Play,
    Users,
    Mail,
    RefreshCw,
    Database,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { auth } from '@/firebase'

interface CronJobStatus {
    running: boolean
    lastRun?: Date
    lastResult?: {
        success: boolean
        emailsSent?: number
        usersProcessed?: number
        collectionsUpdated?: number
        notificationsCreated?: number
    }
}

export default function CronJobsPanel() {
    const { showSuccess, showError } = useToast()
    const [expandedSection, setExpandedSection] = useState<string | null>('overview')
    const [jobStatuses, setJobStatuses] = useState<Record<string, CronJobStatus>>({
        'trending-all': { running: false },
        'cache-all': { running: false },
        'social-all': { running: false },
    })

    const runCronJob = async (jobType: 'trending' | 'cache' | 'social', adminOnly: boolean) => {
        const jobKey = `${jobType}-${adminOnly ? 'admin' : 'all'}`

        setJobStatuses((prev) => ({
            ...prev,
            [jobKey]: { ...prev[jobKey], running: true },
        }))

        try {
            const user = auth.currentUser
            if (!user) {
                showError('Authentication required')
                return
            }

            const idToken = await user.getIdToken()

            let endpoint = ''
            const params = new URLSearchParams()

            if (!adminOnly) {
                // All users mode - no adminOnly parameter or set to false
                params.set('adminOnly', 'false')
            }

            switch (jobType) {
                case 'trending':
                    endpoint = `/api/cron/update-trending${!adminOnly ? `?${params}` : ''}`
                    break
                case 'cache':
                    endpoint = `/api/cron/refresh-collection-cache${!adminOnly ? `?${params}` : ''}`
                    break
                case 'social':
                    endpoint = `/api/cron/social-digest${!adminOnly ? `?${params}` : ''}`
                    break
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            })

            const result = await response.json()

            if (response.ok) {
                setJobStatuses((prev) => ({
                    ...prev,
                    [jobKey]: {
                        running: false,
                        lastRun: new Date(),
                        lastResult: {
                            success: true,
                            emailsSent: result.emailsSent,
                            usersProcessed: result.totalUsers,
                            collectionsUpdated: result.collectionsUpdated,
                            notificationsCreated: result.notificationsCreated,
                        },
                    },
                }))

                const details = []
                if (result.emailsSent) details.push(`${result.emailsSent} emails sent`)
                if (result.totalUsers) details.push(`${result.totalUsers} users processed`)
                if (result.collectionsUpdated)
                    details.push(`${result.collectionsUpdated} collections updated`)
                if (result.notificationsCreated)
                    details.push(`${result.notificationsCreated} notifications`)

                showSuccess(
                    `${jobType.charAt(0).toUpperCase() + jobType.slice(1)} job complete! ${details.join(', ')}`
                )
            } else {
                throw new Error(result.error || 'Job failed')
            }
        } catch (error) {
            console.error(`Cron job error (${jobType}):`, error)
            setJobStatuses((prev) => ({
                ...prev,
                [jobKey]: {
                    running: false,
                    lastResult: { success: false },
                },
            }))
            showError(error instanceof Error ? error.message : `Failed to run ${jobType} job`)
        }
    }

    const Section = ({
        id,
        title,
        icon,
        children,
    }: {
        id: string
        title: string
        icon: React.ReactNode
        children: React.ReactNode
    }) => {
        const isExpanded = expandedSection === id

        return (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpandedSection(isExpanded ? null : id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-750 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <div className="text-gray-400">{isExpanded ? '−' : '+'}</div>
                </button>
                {isExpanded && <div className="p-6 pt-0 border-t border-gray-700">{children}</div>}
            </div>
        )
    }

    const JobCard = ({
        title,
        description,
        jobType,
        schedule,
        lastRun,
        lastResult,
        running,
    }: {
        title: string
        description: string
        jobType: 'trending' | 'cache' | 'social'
        schedule: string
        lastRun?: Date
        lastResult?: any
        running: boolean
    }) => {
        return (
            <div className="bg-gray-900 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="text-white font-medium mb-1">{title}</h4>
                        <p className="text-sm text-gray-400">{description}</p>
                    </div>
                    {lastResult && (
                        <div
                            className={`flex items-center gap-1 ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}
                        >
                            {lastResult.success ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {/* Schedule Info */}
                    <div className="p-3 bg-blue-900/20 border border-blue-800 rounded">
                        <p className="text-xs text-blue-400 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <strong>Vercel Schedule:</strong> {schedule}
                        </p>
                    </div>

                    {/* Last Run Info */}
                    {lastRun && lastResult && (
                        <div className="p-3 bg-gray-800 rounded">
                            <p className="text-xs text-gray-400 mb-2">
                                <strong>Last Run:</strong> {lastRun.toLocaleString()}
                            </p>
                            {lastResult.emailsSent !== undefined && (
                                <p className="text-xs text-gray-400">
                                    📧 {lastResult.emailsSent} emails sent
                                </p>
                            )}
                            {lastResult.usersProcessed !== undefined && (
                                <p className="text-xs text-gray-400">
                                    👥 {lastResult.usersProcessed} users processed
                                </p>
                            )}
                            {lastResult.collectionsUpdated !== undefined && (
                                <p className="text-xs text-gray-400">
                                    📁 {lastResult.collectionsUpdated} collections updated
                                </p>
                            )}
                            {lastResult.notificationsCreated !== undefined && (
                                <p className="text-xs text-gray-400">
                                    🔔 {lastResult.notificationsCreated} notifications created
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={() => runCronJob(jobType, false)}
                        disabled={running}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition"
                    >
                        {running ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4" />
                                Run for All Users
                            </>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-6 w-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Cron Jobs Management</h2>
                </div>
                <p className="text-gray-300 text-sm">
                    Production cron jobs that run on schedule via Vercel. These process all users
                    and send real emails.
                </p>
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <strong>Warning:</strong> These buttons trigger production jobs that affect
                        ALL users. Use with caution.
                    </p>
                </div>
            </div>

            {/* Overview Section */}
            <Section
                id="overview"
                title="System Overview"
                icon={<Database className="h-5 w-5 text-green-500" />}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail className="h-4 w-4 text-blue-400" />
                                <h4 className="text-sm font-medium text-white">Trending Digest</h4>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">
                                Sends weekly trending content emails
                            </p>
                            <p className="text-xs text-green-500">Status: Active</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <RefreshCw className="h-4 w-4 text-teal-400" />
                                <h4 className="text-sm font-medium text-white">Collection Cache</h4>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">
                                Refreshes user collection caches
                            </p>
                            <p className="text-xs text-green-500">Status: Active</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-purple-400" />
                                <h4 className="text-sm font-medium text-white">Social Digest</h4>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">
                                Batches social interaction emails
                            </p>
                            <p className="text-xs text-green-500">Status: Active</p>
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-white mb-2">
                            How Vercel Cron Works
                        </h4>
                        <ul className="space-y-1 text-xs text-gray-300">
                            <li>
                                • Cron jobs are defined in{' '}
                                <code className="text-blue-400">vercel.json</code>
                            </li>
                            <li>• Vercel automatically calls the endpoint at scheduled times</li>
                            <li>
                                • Jobs use <code className="text-blue-400">CRON_SECRET</code> for
                                authentication
                            </li>
                            <li>
                                • Free tier allows 1 job per day (we have 3 running on different
                                days)
                            </li>
                            <li>
                                • Manual triggers from this panel do NOT count toward Vercel's limit
                            </li>
                        </ul>
                    </div>
                </div>
            </Section>

            {/* Trending Digest Section */}
            <Section
                id="trending"
                title="Trending Digest (Mondays 2 AM UTC)"
                icon={<Mail className="h-5 w-5 text-blue-500" />}
            >
                <div className="space-y-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <h4 className="text-white">What it does:</h4>
                        <ul className="text-gray-300">
                            <li>Fetches current trending movies and TV shows from TMDB</li>
                            <li>
                                Sends email to all users who have enabled trending notifications
                            </li>
                            <li>Includes top 5 trending movies and top 5 trending TV shows</li>
                            <li>Users can unsubscribe via link in email</li>
                        </ul>
                        <h4 className="text-white mt-4">Requirements:</h4>
                        <ul className="text-gray-300">
                            <li>
                                User must have <code>notifications.email = true</code>
                            </li>
                            <li>
                                User must have{' '}
                                <code>notifications.types.trending_update = true</code>
                            </li>
                            <li>User must have valid email address</li>
                        </ul>
                    </div>

                    <JobCard
                        title="Run Trending Digest for All Users"
                        description="Fetches trending content and sends emails to all opted-in users"
                        jobType="trending"
                        schedule="Every Monday at 2:00 AM UTC"
                        lastRun={jobStatuses['trending-all'].lastRun}
                        lastResult={jobStatuses['trending-all'].lastResult}
                        running={jobStatuses['trending-all'].running}
                    />
                </div>
            </Section>

            {/* Collection Cache Section */}
            <Section
                id="cache"
                title="Collection Cache Refresh (Sundays 2 AM UTC)"
                icon={<RefreshCw className="h-5 w-5 text-teal-500" />}
            >
                <div className="space-y-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <h4 className="text-white">What it does:</h4>
                        <ul className="text-gray-300">
                            <li>
                                Finds all TMDB genre-based collections with actor/director filters
                            </li>
                            <li>Re-fetches top 50 results from TMDB for each collection</li>
                            <li>Compares with existing cache to detect new content</li>
                            <li>Updates cache if top 50 results have changed</li>
                            <li>Creates notification for user when new items are found</li>
                        </ul>
                        <h4 className="text-white mt-4">Optimization:</h4>
                        <ul className="text-gray-300">
                            <li>Only processes collections not updated in the last 7 days</li>
                            <li>Skips manual collections (no API calls needed)</li>
                            <li>Skips AI-generated collections (static content)</li>
                        </ul>
                    </div>

                    <JobCard
                        title="Run Collection Cache for All Users"
                        description="Refreshes collection caches and creates notifications for new content"
                        jobType="cache"
                        schedule="Every Sunday at 2:00 AM UTC"
                        lastRun={jobStatuses['cache-all'].lastRun}
                        lastResult={jobStatuses['cache-all'].lastResult}
                        running={jobStatuses['cache-all'].running}
                    />
                </div>
            </Section>

            {/* Social Digest Section */}
            <Section
                id="social"
                title="Social Digest (Wednesdays 2 AM UTC)"
                icon={<Users className="h-5 w-5 text-purple-500" />}
            >
                <div className="space-y-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <h4 className="text-white">What it does:</h4>
                        <ul className="text-gray-300">
                            <li>Queries all pending social notifications from the past 7 days</li>
                            <li>Groups notifications by user (comments + likes)</li>
                            <li>
                                Sends one batched digest email per user with all their interactions
                            </li>
                            <li>
                                Marks notifications as <code>emailSent: true</code> after sending
                            </li>
                        </ul>
                        <h4 className="text-white mt-4">Notification Types:</h4>
                        <ul className="text-gray-300">
                            <li>
                                <strong>ranking_comment:</strong> Someone commented on user's
                                ranking
                            </li>
                            <li>
                                <strong>ranking_like:</strong> Someone liked user's ranking
                                (batched)
                            </li>
                        </ul>
                        <h4 className="text-white mt-4">Requirements:</h4>
                        <ul className="text-gray-300">
                            <li>
                                User must have <code>notifications.email = true</code>
                            </li>
                            <li>
                                User must have{' '}
                                <code>notifications.types.social_interactions = true</code>
                            </li>
                            <li>User must have valid email address</li>
                            <li>
                                Must have pending notifications with <code>emailSent: false</code>
                            </li>
                        </ul>
                    </div>

                    <JobCard
                        title="Run Social Digest for All Users"
                        description="Sends batched social interaction emails to all users with pending notifications"
                        jobType="social"
                        schedule="Every Wednesday at 2:00 AM UTC"
                        lastRun={jobStatuses['social-all'].lastRun}
                        lastResult={jobStatuses['social-all'].lastResult}
                        running={jobStatuses['social-all'].running}
                    />
                </div>
            </Section>

            {/* Documentation Link */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Additional Documentation</h3>
                <p className="text-sm text-gray-400 mb-4">
                    For detailed technical documentation, API specifications, and troubleshooting
                    guides, see:
                </p>
                <a
                    href="/docs/CRON_JOBS.md"
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                    <Database className="h-4 w-4" />
                    View Full Documentation
                </a>
            </div>
        </div>
    )
}
