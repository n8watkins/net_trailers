import { useState, useEffect, useRef } from 'react'
import {
    BugAntIcon,
    FireIcon,
    ChatBubbleBottomCenterTextIcon,
    CodeBracketIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    TrashIcon,
    DocumentTextIcon,
    CircleStackIcon,
    EnvelopeIcon,
    ClockIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline'
import { useProfileActions } from '../../hooks/useProfileActions'
import useUserData from '../../hooks/useUserData'
import { useDebugOperationsStore } from '../../stores/debugOperationsStore'
import useAuth from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { authenticatedFetch, AuthRequiredError } from '../../lib/authenticatedFetch'
import { useNotificationStore } from '../../stores/notificationStore'
import { useSessionStore } from '../../stores/sessionStore'

interface DebugSettings {
    showFirebaseTracker: boolean
    showFirebaseDebug: boolean
    showSessionDebug: boolean
    showGuestDebug: boolean
    showCacheDebug: boolean
    showToastTester: boolean // Shows "Test Toasts" button in header
    showApiResults: boolean
    showWebVitals: boolean
    showNotifTester: boolean // Shows "Generate Test Notifications" button in settings
    showUIDebug: boolean
    showTrackingDebug: boolean
    showNotificationDebug: boolean
    showApiDebug: boolean
    showChildSafetyDebug: boolean
    showNextServerLogs: boolean
    showWatchHistoryDebug: boolean
    showBannerDebug: boolean
    showCacheHealth: boolean
    showStartupHealth: boolean
}

interface Position {
    x: number
    y: number
}

interface CategoryState {
    firebase: boolean
    ui: boolean
    features: boolean
    data: boolean
    email: boolean
    cron: boolean
}

type DebugCategory = 'firebase' | 'ui' | 'features' | 'data' | 'email' | 'cron'

// Static color map for Tailwind - dynamic class names don't work with Tailwind's purge
const COLOR_CLASSES: Record<string, { enabled: string; disabled: string }> = {
    orange: {
        enabled: 'bg-orange-600/20 text-orange-400 border border-orange-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    blue: {
        enabled: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    purple: {
        enabled: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    teal: {
        enabled: 'bg-teal-600/20 text-teal-400 border border-teal-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    cyan: {
        enabled: 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    sky: {
        enabled: 'bg-sky-600/20 text-sky-400 border border-sky-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    green: {
        enabled: 'bg-green-600/20 text-green-400 border border-green-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    emerald: {
        enabled: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    indigo: {
        enabled: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    amber: {
        enabled: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    slate: {
        enabled: 'bg-slate-600/20 text-slate-400 border border-slate-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    rose: {
        enabled: 'bg-rose-600/20 text-rose-400 border border-rose-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    yellow: {
        enabled: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    pink: {
        enabled: 'bg-pink-600/20 text-pink-400 border border-pink-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    red: {
        enabled: 'bg-red-600/20 text-red-400 border border-red-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    violet: {
        enabled: 'bg-violet-600/20 text-violet-400 border border-violet-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
    gray: {
        enabled: 'bg-gray-600/20 text-gray-400 border border-gray-500/30',
        disabled: 'bg-gray-800 text-gray-500 border border-gray-700',
    },
}

export default function DebugControls() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: false,
        showFirebaseDebug: false,
        showSessionDebug: false,
        showGuestDebug: false,
        showCacheDebug: false,
        showToastTester: false,
        showApiResults: false,
        showWebVitals: false,
        showNotifTester: false,
        showUIDebug: false,
        showTrackingDebug: false,
        showNotificationDebug: false,
        showApiDebug: false,
        showChildSafetyDebug: false,
        showNextServerLogs: true, // Enabled by default
        showWatchHistoryDebug: false,
        showBannerDebug: false,
        showCacheHealth: false,
        showStartupHealth: false,
    })

    // Profile actions for seed
    const { isSeeding, handleSeedDataServerSide } = useProfileActions()

    // Debug operations store for mutual exclusion
    const { isClearing, setClearing, canStartClearing } = useDebugOperationsStore()

    // User data for clearing user data
    const { clearAccountData } = useUserData()

    // Email sending state
    const { user } = useAuth()

    // Check if current user is admin (server-side check)
    const [isAdmin, setIsAdmin] = useState(false)
    const { showSuccess, showError } = useToast()
    const [sendingEmail, setSendingEmail] = useState<string | null>(null)

    // Notification store and session
    const { createNotification } = useNotificationStore()
    const { getUserId } = useSessionStore()
    const userId = getUserId()
    const [seedingNotification, setSeedingNotification] = useState(false)

    // Check admin status on mount
    useEffect(() => {
        if (user) {
            authenticatedFetch('/api/admin/check')
                .then((res) => res.json())
                .then((data) => setIsAdmin(data.isAdmin || false))
                .catch(() => setIsAdmin(false))
        } else {
            setIsAdmin(false)
        }
    }, [user])

    // Visibility state - load from localStorage, hidden by default
    const [isVisible, setIsVisible] = useState(false)

    // Category expand/collapse state
    const [expandedCategories, setExpandedCategories] = useState<CategoryState>({
        firebase: true,
        ui: true,
        features: true,
        data: true,
        email: true,
        cron: true,
    })

    // Drag state - default position is a bit to the left (initialized after mount)
    const [position, setPosition] = useState<Position>({ x: 0, y: 16 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const dragHandleRef = useRef<HTMLDivElement>(null)
    const isFirstMount = useRef(true)
    const isFirstSettingsMount = useRef(true)
    const isFirstVisibilityMount = useRef(true)
    const isFirstCategoryMount = useRef(true)

    // Keyboard shortcut handler for Alt+Shift+Q
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt+Shift+Q to toggle visibility
            if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'q') {
                e.preventDefault()
                setIsVisible((prev) => !prev)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Load settings from localStorage and initialize position and visibility
    useEffect(() => {
        const saved = localStorage.getItem('debugSettings')
        if (saved) {
            setSettings(JSON.parse(saved))
        }

        // Load saved visibility state
        const savedVisibility = localStorage.getItem('debugConsoleVisible')
        if (savedVisibility !== null) {
            setIsVisible(JSON.parse(savedVisibility))
        }

        // Load saved category state
        const savedCategories = localStorage.getItem('debugCategoriesExpanded')
        if (savedCategories) {
            setExpandedCategories(JSON.parse(savedCategories))
        }

        // Load saved position or set default based on window width
        const savedPosition = localStorage.getItem('debugPosition')
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition))
        } else {
            // Set default position based on window width
            setPosition({ x: window.innerWidth - 600, y: 16 })
        }

        // Listen for external changes to debug settings (e.g., from keyboard shortcuts)
        const handleExternalChange = (event: CustomEvent<DebugSettings>) => {
            // Only update if settings actually changed to prevent loops
            setSettings((prev) => {
                const changed = JSON.stringify(prev) !== JSON.stringify(event.detail)
                return changed ? event.detail : prev
            })
        }

        window.addEventListener('debugSettingsChanged', handleExternalChange as any)
        return () => window.removeEventListener('debugSettingsChanged', handleExternalChange as any)
    }, [])

    // Save settings to localStorage (skip initial mount to avoid overwriting saved settings)
    useEffect(() => {
        if (isFirstSettingsMount.current) {
            isFirstSettingsMount.current = false
            return
        }
        localStorage.setItem('debugSettings', JSON.stringify(settings))
        // Dispatch event for other components to listen to
        window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
    }, [settings])

    // Save position to localStorage (skip initial mount to avoid overwriting saved position)
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false
            return
        }
        localStorage.setItem('debugPosition', JSON.stringify(position))
    }, [position])

    // Save visibility state to localStorage (skip initial mount)
    useEffect(() => {
        if (isFirstVisibilityMount.current) {
            isFirstVisibilityMount.current = false
            return
        }
        localStorage.setItem('debugConsoleVisible', JSON.stringify(isVisible))
    }, [isVisible])

    // Save category state to localStorage (skip initial mount)
    useEffect(() => {
        if (isFirstCategoryMount.current) {
            isFirstCategoryMount.current = false
            return
        }
        localStorage.setItem('debugCategoriesExpanded', JSON.stringify(expandedCategories))
    }, [expandedCategories])

    // Handle drag start - only from the bug icon
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        })
    }

    // Handle dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                e.preventDefault()
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y,
                })
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    // Show all controls when hovering or dragging
    const showAllControls = isHovered || isDragging

    // Helper to determine if a specific button should be shown
    const shouldShowButton = (settingKey: keyof DebugSettings) => {
        return showAllControls || settings[settingKey]
    }

    // Helper to check if any setting in a category is enabled
    const hasEnabledSetting = (category: DebugCategory): boolean => {
        const categorySettings = getCategorySettings(category)
        return categorySettings.some((key) => settings[key])
    }

    // Get settings for a category
    const getCategorySettings = (category: DebugCategory): (keyof DebugSettings)[] => {
        switch (category) {
            case 'firebase':
                return [
                    'showFirebaseTracker',
                    'showFirebaseDebug',
                    'showSessionDebug',
                    'showGuestDebug',
                    'showCacheDebug',
                    'showWatchHistoryDebug',
                ]
            case 'ui':
                return [
                    'showToastTester',
                    'showApiResults',
                    'showWebVitals',
                    'showUIDebug',
                    'showApiDebug',
                    'showNextServerLogs',
                    'showBannerDebug',
                    'showCacheHealth',
                    'showStartupHealth',
                ]
            case 'features':
                return [
                    'showTrackingDebug',
                    'showNotificationDebug',
                    'showNotifTester',
                    'showChildSafetyDebug',
                ]
            case 'data':
            case 'email':
            case 'cron':
                // These categories don't have settings toggles, only action buttons
                return []
        }
    }

    const toggleSetting = async (key: keyof DebugSettings) => {
        const newValue = !settings[key]
        setSettings((prev) => ({ ...prev, [key]: newValue }))

        // Special handling for Next.js server logs - write to flag file via API
        if (key === 'showNextServerLogs') {
            try {
                await fetch('/api/debug/next-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: newValue }),
                })
            } catch {
                // Silently fail - the toggle still updates localStorage
            }
        }
    }

    const toggleCategory = (category: DebugCategory) => {
        setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
    }

    // Clear NetTrailer localStorage and reload
    const handleClearLocalStorage = () => {
        Object.keys(localStorage)
            .filter((key) => key.startsWith('nettrailer'))
            .forEach((key) => localStorage.removeItem(key))
        location.reload()
    }

    // Clear user data (same as settings page "Clear All Data")
    const handleClearUserData = async () => {
        // Check if we can start clearing (mutual exclusion with seeding)
        if (!canStartClearing()) {
            console.warn('[DebugControls] Cannot clear data - operation already in progress')
            return
        }

        setClearing(true)
        try {
            await clearAccountData()
            console.log('[DebugControls] ✅ User data cleared')
        } catch (error) {
            console.error('[DebugControls] Failed to clear user data:', error)
        } finally {
            setClearing(false)
        }
    }

    // Seed a random trending notification
    const handleSeedTrendingNotification = async () => {
        if (!userId) {
            showError('No user ID - sign in to seed notifications')
            return
        }

        setSeedingNotification(true)
        try {
            // Randomly choose movies or TV
            const mediaType = Math.random() > 0.5 ? 'movie' : 'tv'
            const endpoint = mediaType === 'movie' ? '/api/movies/trending' : '/api/tv/trending'

            // Fetch trending content
            const response = await fetch(`${endpoint}?page=1`)
            if (!response.ok) {
                throw new Error('Failed to fetch trending content')
            }

            const data = await response.json()
            const trendingItems = data.results || []

            if (trendingItems.length === 0) {
                throw new Error('No trending items found')
            }

            // Pick a random item
            const randomIndex = Math.floor(Math.random() * trendingItems.length)
            const randomItem = trendingItems[randomIndex]

            // Create notification
            await createNotification(userId, {
                type: 'trending_update',
                title: 'Now Trending! 🔥',
                message: `${randomItem.title || randomItem.name} is currently trending!`,
                contentId: randomItem.id,
                mediaType: mediaType,
                imageUrl: randomItem.poster_path
                    ? `https://image.tmdb.org/t/p/w500${randomItem.poster_path}`
                    : undefined,
                actionUrl: `/${mediaType}/${randomItem.id}`,
                expiresIn: 7,
            })

            showSuccess(`Created trending notification for ${randomItem.title || randomItem.name}`)
            console.log('[DebugControls] ✅ Created trending notification:', randomItem)
        } catch (error) {
            console.error('[DebugControls] Failed to create trending notification:', error)
            showError(
                error instanceof Error ? error.message : 'Failed to create trending notification'
            )
        } finally {
            setSeedingNotification(false)
        }
    }

    // Send test email
    const handleSendEmail = async (
        emailType: string,
        endpoint: string,
        body: object,
        method: string = 'POST'
    ) => {
        if (!user?.email) {
            showError('No email address - sign in to test emails')
            return
        }

        setSendingEmail(emailType)
        try {
            // Build URL with query params for GET requests
            let url = endpoint
            if (method === 'GET' && Object.keys(body).length > 0) {
                const params = new URLSearchParams(
                    Object.entries(body).map(([k, v]) => [k, String(v)])
                )
                url = `${endpoint}?${params.toString()}`
            }

            const response = await authenticatedFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify(body) : undefined,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || `Failed to send ${emailType}`)
            }

            // Show detailed success message for cron jobs
            if (
                emailType.includes('Trending') ||
                emailType.includes('Cache') ||
                emailType.includes('Social')
            ) {
                const details: string[] = []
                if (data.emailsSent !== undefined) details.push(`${data.emailsSent} emails sent`)
                if (data.collectionsUpdated !== undefined)
                    details.push(`${data.collectionsUpdated} collections updated`)
                if (data.notificationsCreated !== undefined)
                    details.push(`${data.notificationsCreated} notifications`)
                if (data.totalUsers !== undefined)
                    details.push(`${data.totalUsers} users processed`)

                const detailsStr = details.length > 0 ? details.join(', ') : 'Completed'
                showSuccess(`${emailType} complete! ${detailsStr}`)
            } else if (emailType.includes('Digest')) {
                const details = `${data.newItems || 0} new items, ${data.notifications || 0} notifications, ${data.emailsSent || 0} emails sent`
                showSuccess(`${emailType} complete! ${details}`)
            } else {
                showSuccess(`${emailType} sent to ${user.email}!`)
            }
        } catch (error) {
            console.error(`Email test error (${emailType}):`, error)
            if (error instanceof AuthRequiredError) {
                showError('Sign in again to send emails')
            } else {
                showError(error instanceof Error ? error.message : `Failed: ${emailType}`)
            }
        } finally {
            setSendingEmail(null)
        }
    }

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null

    // Don't render if not visible
    if (!isVisible) return null

    // Render a category section
    const renderCategory = (
        category: DebugCategory,
        title: string,
        icon: React.ReactNode,
        buttons: React.ReactNode
    ) => {
        const isExpanded = expandedCategories[category]
        const hasEnabled = hasEnabledSetting(category)

        // Show category if hovering/dragging OR if it has enabled settings
        if (!showAllControls && !hasEnabled) return null

        return (
            <div className="flex flex-col gap-1">
                <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800/50 rounded transition-colors group"
                    title={`Toggle ${title} category`}
                >
                    <div className="flex items-center gap-1.5 flex-1">
                        {icon}
                        <span className="text-xs font-medium text-gray-400 group-hover:text-gray-300">
                            {title}
                        </span>
                        {hasEnabled && !showAllControls && (
                            <span className="text-[10px] text-emerald-500">●</span>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                    ) : (
                        <ChevronRightIcon className="w-3 h-3 text-gray-500" />
                    )}
                </button>

                {isExpanded && (
                    <div className="flex items-center gap-2 flex-wrap pl-6">{buttons}</div>
                )}
            </div>
        )
    }

    // Render a debug button
    const renderButton = (
        key: keyof DebugSettings,
        label: string,
        title: string,
        color: string,
        icon?: React.ReactNode
    ) => {
        // Only show if setting is enabled OR if we're showing all controls
        if (!showAllControls && !settings[key]) return null

        const isEnabled = settings[key]
        const colorConfig = COLOR_CLASSES[color] || COLOR_CLASSES.gray
        const colorClasses = isEnabled ? colorConfig.enabled : colorConfig.disabled

        return (
            <button
                key={key}
                onClick={() => toggleSetting(key)}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${colorClasses}`}
                title={title}
            >
                {icon}
                <span className="text-xs">{label}</span>
            </button>
        )
    }

    return (
        <div
            className={`fixed z-[9999] bg-gray-900/95 rounded-lg border border-gray-700 px-3 py-2 select-none ${isDragging ? '' : 'transition-all duration-200'} ${showAllControls ? 'max-w-3xl' : ''}`}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            onMouseEnter={() => !isDragging && setIsHovered(true)}
            onMouseLeave={() => !isDragging && setIsHovered(false)}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div
                    ref={dragHandleRef}
                    className="cursor-move hover:bg-gray-800 rounded p-1 -m-1 transition-colors flex-shrink-0"
                    title="Drag to move · Hover to expand"
                    onMouseDown={handleDragStart}
                >
                    <BugAntIcon className="w-6 h-6 text-gray-400" />
                </div>

                {/* Categories - Always show selected items, expand on hover */}
                <div className="flex flex-col gap-2.5 min-w-0">
                    {/* Firebase & Data Category */}
                    {renderCategory(
                        'firebase',
                        'Firebase & Data',
                        <FireIcon className="w-3.5 h-3.5 text-orange-500" />,
                        <>
                            {renderButton(
                                'showFirebaseTracker',
                                'Tracker',
                                'Toggle Firebase Call Tracker',
                                'orange',
                                <FireIcon className="w-3 h-3" />
                            )}
                            {renderButton(
                                'showFirebaseDebug',
                                'Auth',
                                'Toggle Auth Flow Logs',
                                'blue'
                            )}
                            {renderButton(
                                'showSessionDebug',
                                'Session',
                                'Toggle Session Logs',
                                'purple'
                            )}
                            {renderButton('showGuestDebug', 'Guest', 'Toggle Guest Logs', 'teal')}
                            {renderButton('showCacheDebug', 'Cache', 'Toggle Cache Logs', 'cyan')}
                            {renderButton(
                                'showWatchHistoryDebug',
                                'Watch History',
                                'Toggle Watch History & Firestore Sync Logs',
                                'sky'
                            )}
                        </>
                    )}

                    {/* UI & Interaction Category */}
                    {renderCategory(
                        'ui',
                        'UI & Interaction',
                        <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 text-blue-500" />,
                        <>
                            {renderButton(
                                'showToastTester',
                                'Toast Test',
                                'Show "Test Toasts" button in header',
                                'green',
                                <ChatBubbleBottomCenterTextIcon className="w-3 h-3" />
                            )}
                            {renderButton(
                                'showApiResults',
                                'API Results',
                                'Toggle API Results Button',
                                'purple',
                                <CodeBracketIcon className="w-3 h-3" />
                            )}
                            {renderButton(
                                'showWebVitals',
                                'Vitals',
                                'Toggle Web Vitals HUD (Alt+Shift+V)',
                                'emerald'
                            )}
                            {renderButton(
                                'showUIDebug',
                                'UI Logs',
                                'Toggle UI Interaction Logs (modals, infinite scroll, etc.)',
                                'indigo'
                            )}
                            {renderButton(
                                'showApiDebug',
                                'API/Server',
                                'Toggle API & Server-side Logs',
                                'amber',
                                <CodeBracketIcon className="w-3 h-3" />
                            )}
                            {renderButton(
                                'showNextServerLogs',
                                'Next.js Server',
                                'Toggle Next.js dev server request logs (requires restart)',
                                'slate'
                            )}
                            {renderButton(
                                'showBannerDebug',
                                'Banner',
                                'Toggle Banner Carousel & Image Loading Logs',
                                'rose'
                            )}
                            {renderButton(
                                'showCacheHealth',
                                'Cache Health',
                                'Toggle Firestore Cache Health Panel',
                                'cyan'
                            )}
                            {renderButton(
                                'showStartupHealth',
                                'Startup Health',
                                'Toggle Startup Health Check Panel',
                                'teal'
                            )}
                        </>
                    )}

                    {/* Features & Tools Category */}
                    {renderCategory(
                        'features',
                        'Features & Tools',
                        <SparklesIcon className="w-3.5 h-3.5 text-purple-500" />,
                        <>
                            {renderButton(
                                'showTrackingDebug',
                                'Tracking',
                                'Toggle Interaction Tracking Logs',
                                'yellow'
                            )}
                            {renderButton(
                                'showNotificationDebug',
                                'Notif',
                                'Toggle Notification System Logs',
                                'pink'
                            )}
                            {renderButton(
                                'showNotifTester',
                                'Notif Test',
                                'Show "Generate Test Notifications" button in settings',
                                'red'
                            )}
                            {renderButton(
                                'showChildSafetyDebug',
                                'Child Safety',
                                'Toggle Child Safety Mode Debug Logs (TMDB filtering)',
                                'violet'
                            )}
                        </>
                    )}

                    {/* Data Actions Category - Collapsible */}
                    {showAllControls &&
                        renderCategory(
                            'data',
                            'Data Actions',
                            <CircleStackIcon className="w-3.5 h-3.5 text-emerald-500" />,
                            <>
                                {/* Seed Data Button */}
                                <button
                                    onClick={handleSeedDataServerSide}
                                    disabled={isSeeding || isClearing}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                        isClearing
                                            ? 'Cannot seed while clearing data'
                                            : 'Seed test data in background (15 liked, 8 hidden, 12 watch later, 20 watch history) - continues even if you navigate away'
                                    }
                                >
                                    <SparklesIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {isSeeding ? 'Seeding...' : 'Seed Data'}
                                    </span>
                                </button>

                                {/* Seed Trending Notification Button */}
                                <button
                                    onClick={handleSeedTrendingNotification}
                                    disabled={seedingNotification || !userId}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                        !userId
                                            ? 'Sign in to seed trending notifications'
                                            : 'Create a notification for a random trending movie or TV show'
                                    }
                                >
                                    <BellAlertIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {seedingNotification ? 'Creating...' : 'Seed Trending'}
                                    </span>
                                </button>

                                {/* Clear User Data Button */}
                                <button
                                    onClick={handleClearUserData}
                                    disabled={isClearing || isSeeding}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                        isSeeding
                                            ? 'Cannot clear while seeding data'
                                            : 'Clear all user data (collections, ratings, watch history, etc.)'
                                    }
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {isClearing ? 'Clearing...' : 'Clear User Data'}
                                    </span>
                                </button>

                                {/* Clear Storage Button */}
                                <button
                                    onClick={handleClearLocalStorage}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/40"
                                    title="Clear NetTrailer localStorage data and reload"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    <span className="text-xs">Clear Storage</span>
                                </button>

                                <div className="w-px h-6 bg-gray-700" />

                                {/* Docs Link */}
                                <a
                                    href="/docs/debugger-console"
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40"
                                    title="View debug console documentation"
                                >
                                    <DocumentTextIcon className="w-3 h-3" />
                                    <span className="text-xs">Docs</span>
                                </a>
                            </>
                        )}

                    {/* Email Testing Category - Only visible for admin users */}
                    {showAllControls &&
                        isAdmin &&
                        renderCategory(
                            'email',
                            'Email Testing (Admin)',
                            <EnvelopeIcon className="w-3.5 h-3.5 text-sky-500" />,
                            <>
                                {/* Trending Content Email */}
                                <button
                                    onClick={() =>
                                        handleSendEmail('Trending', '/api/email/send-pilot', {
                                            email: user?.email,
                                            userName: user?.displayName || '',
                                        })
                                    }
                                    disabled={sendingEmail !== null || !user?.email || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Send trending content email (pilot template with top 5 movies + TV) - Admin only"
                                >
                                    <EnvelopeIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Trending' ? 'Sending...' : 'Trending'}
                                    </span>
                                </button>

                                {/* Weekly Digest - Real */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Digest (Real)',
                                            '/api/email/test-weekly-digest',
                                            { demoMode: false }
                                        )
                                    }
                                    disabled={sendingEmail !== null || !user?.email || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Run weekly digest cron (real data comparison, only emails if new trending found) - Admin only"
                                >
                                    <EnvelopeIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Digest (Real)' ? 'Running...' : 'Digest'}
                                    </span>
                                </button>

                                {/* Weekly Digest - Demo */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Digest (Demo)',
                                            '/api/email/test-weekly-digest',
                                            { demoMode: true }
                                        )
                                    }
                                    disabled={sendingEmail !== null || !user?.email || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:bg-pink-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Run weekly digest cron (demo mode - always finds new items and sends email) - Admin only"
                                >
                                    <EnvelopeIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Digest (Demo)'
                                            ? 'Running...'
                                            : 'Demo Digest'}
                                    </span>
                                </button>
                            </>
                        )}

                    {/* Cron Jobs Category - Only visible for admin users */}
                    {showAllControls &&
                        isAdmin &&
                        renderCategory(
                            'cron',
                            'Cron Jobs (Admin)',
                            <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />,
                            <>
                                {/* ADMIN-ONLY TRIGGERS (Single User) */}
                                <div className="w-full flex items-center gap-2 pt-1">
                                    <div className="h-px flex-1 bg-gray-700" />
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                        Admin Only (You)
                                    </span>
                                    <div className="h-px flex-1 bg-gray-700" />
                                </div>

                                {/* Admin-Only Trending */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Trending (Admin)',
                                            '/api/cron/update-trending',
                                            { adminOnly: true },
                                            'GET'
                                        )
                                    }
                                    disabled={sendingEmail !== null || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Test trending digest - admin only (just you)"
                                >
                                    <ClockIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Trending (Admin)'
                                            ? 'Running...'
                                            : 'Trending'}
                                    </span>
                                </button>

                                {/* Admin-Only Collections */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Cache (Admin)',
                                            '/api/cron/refresh-collection-cache',
                                            { adminOnly: true },
                                            'GET'
                                        )
                                    }
                                    disabled={sendingEmail !== null || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-teal-600/20 text-teal-400 border border-teal-500/30 hover:bg-teal-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Refresh collection cache - admin only (just your collections)"
                                >
                                    <ClockIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Cache (Admin)' ? 'Running...' : 'Cache'}
                                    </span>
                                </button>

                                {/* ALL USERS TRIGGERS (Production) */}
                                <div className="w-full flex items-center gap-2 pt-2">
                                    <div className="h-px flex-1 bg-gray-700" />
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                        All Users (Production)
                                    </span>
                                    <div className="h-px flex-1 bg-gray-700" />
                                </div>

                                {/* All Users Trending */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Trending (All)',
                                            '/api/cron/update-trending',
                                            {},
                                            'GET'
                                        )
                                    }
                                    disabled={sendingEmail !== null || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Run trending digest for ALL users (production behavior)"
                                >
                                    <ClockIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Trending (All)'
                                            ? 'Running...'
                                            : 'Trending (All)'}
                                    </span>
                                </button>

                                {/* All Users Collections */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Cache (All)',
                                            '/api/cron/refresh-collection-cache',
                                            {},
                                            'GET'
                                        )
                                    }
                                    disabled={sendingEmail !== null || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-teal-600/20 text-teal-400 border border-teal-500/30 hover:bg-teal-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Refresh collection cache for ALL users (production behavior)"
                                >
                                    <ClockIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Cache (All)'
                                            ? 'Running...'
                                            : 'Cache (All)'}
                                    </span>
                                </button>

                                {/* All Users Social Digest */}
                                <button
                                    onClick={() =>
                                        handleSendEmail(
                                            'Social (All)',
                                            '/api/cron/social-digest',
                                            { adminOnly: false },
                                            'GET'
                                        )
                                    }
                                    disabled={sendingEmail !== null || !isAdmin}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Run social digest for ALL users (production behavior - sends real notifications)"
                                >
                                    <ClockIcon className="w-3 h-3" />
                                    <span className="text-xs">
                                        {sendingEmail === 'Social (All)'
                                            ? 'Running...'
                                            : 'Social (All)'}
                                    </span>
                                </button>
                            </>
                        )}
                </div>
            </div>
        </div>
    )
}

// Export a hook to use debug settings in other components
export function useDebugSettings() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: false,
        showFirebaseDebug: false,
        showSessionDebug: false,
        showGuestDebug: false,
        showCacheDebug: false,
        showToastTester: false,
        showApiResults: false,
        showWebVitals: false,
        showNotifTester: false,
        showUIDebug: false,
        showTrackingDebug: false,
        showNotificationDebug: false,
        showApiDebug: false,
        showChildSafetyDebug: false,
        showNextServerLogs: true, // Enabled by default
        showWatchHistoryDebug: false,
        showBannerDebug: false,
        showCacheHealth: false,
        showStartupHealth: false,
    })

    useEffect(() => {
        // Load initial settings
        const saved = localStorage.getItem('debugSettings')
        if (saved) {
            setSettings(JSON.parse(saved))
        }

        // Listen for changes
        const handleChange = (event: CustomEvent<DebugSettings>) => {
            setSettings(event.detail)
        }

        window.addEventListener('debugSettingsChanged', handleChange as any)
        return () => window.removeEventListener('debugSettingsChanged', handleChange as any)
    }, [])

    return settings
}
