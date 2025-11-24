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
} from '@heroicons/react/24/outline'

interface DebugSettings {
    showFirebaseTracker: boolean
    showFirebaseDebug: boolean
    showSessionDebug: boolean
    showGuestDebug: boolean
    showCacheDebug: boolean
    showToastDebug: boolean
    showApiResults: boolean
    showWebVitals: boolean
    showTestNotifications: boolean
    showUIDebug: boolean
    showTrackingDebug: boolean
    showNotificationDebug: boolean
    showSeedButton: boolean
    showApiDebug: boolean
    showChildSafetyDebug: boolean
    showNextServerLogs: boolean
    showWatchHistoryDebug: boolean
    showBannerDebug: boolean
}

interface Position {
    x: number
    y: number
}

interface CategoryState {
    firebase: boolean
    ui: boolean
    features: boolean
}

type DebugCategory = 'firebase' | 'ui' | 'features'

export default function DebugControls() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: false,
        showFirebaseDebug: false,
        showSessionDebug: false,
        showGuestDebug: false,
        showCacheDebug: false,
        showToastDebug: false,
        showApiResults: false,
        showWebVitals: false,
        showTestNotifications: false,
        showUIDebug: false,
        showTrackingDebug: false,
        showNotificationDebug: false,
        showSeedButton: false,
        showApiDebug: false,
        showChildSafetyDebug: false,
        showNextServerLogs: true, // Enabled by default
        showWatchHistoryDebug: false,
        showBannerDebug: false,
    })

    // Visibility state - load from localStorage, hidden by default
    const [isVisible, setIsVisible] = useState(false)

    // Category expand/collapse state
    const [expandedCategories, setExpandedCategories] = useState<CategoryState>({
        firebase: true,
        ui: true,
        features: true,
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

    // Keyboard shortcut handler for Alt+Shift+D
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt+Shift+D to toggle visibility
            if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
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
                    'showToastDebug',
                    'showApiResults',
                    'showWebVitals',
                    'showUIDebug',
                    'showApiDebug',
                    'showNextServerLogs',
                    'showBannerDebug',
                ]
            case 'features':
                return [
                    'showTrackingDebug',
                    'showNotificationDebug',
                    'showTestNotifications',
                    'showChildSafetyDebug',
                    'showSeedButton',
                ]
        }
    }

    const toggleSetting = (key: keyof DebugSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleCategory = (category: DebugCategory) => {
        setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
    }

    // Clear NetTrailer localStorage and reload
    const handleClearLocalStorage = () => {
        if (confirm('Clear all NetTrailer localStorage data and reload?')) {
            Object.keys(localStorage)
                .filter((key) => key.startsWith('nettrailer'))
                .forEach((key) => localStorage.removeItem(key))
            location.reload()
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
        const colorClasses = isEnabled
            ? `bg-${color}-600/20 text-${color}-400 border border-${color}-500/30`
            : 'bg-gray-800 text-gray-500 border border-gray-700'

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
                                'showToastDebug',
                                'Toast',
                                'Toggle Toast Debug',
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
                                'showTestNotifications',
                                'TestNotif',
                                'Toggle Test Notification Button',
                                'red'
                            )}
                            {renderButton(
                                'showChildSafetyDebug',
                                'Child Safety',
                                'Toggle Child Safety Mode Debug Logs (TMDB filtering)',
                                'violet'
                            )}
                            <div className="w-px h-6 bg-gray-700" />
                            {renderButton(
                                'showSeedButton',
                                'Seed Btn',
                                'Toggle Seed Data Button on Profile',
                                'purple',
                                <SparklesIcon className="w-3 h-3" />
                            )}
                            {showAllControls && (
                                <button
                                    onClick={handleClearLocalStorage}
                                    className="flex items-center space-x-1 px-2 py-1 rounded transition-colors bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40"
                                    title="Clear NetTrailer localStorage data and reload"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    <span className="text-xs">Clear Storage</span>
                                </button>
                            )}
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
        showToastDebug: false,
        showApiResults: false,
        showWebVitals: false,
        showTestNotifications: false,
        showUIDebug: false,
        showTrackingDebug: false,
        showNotificationDebug: false,
        showSeedButton: false,
        showApiDebug: false,
        showChildSafetyDebug: false,
        showNextServerLogs: true, // Enabled by default
        showWatchHistoryDebug: false,
        showBannerDebug: false,
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
