import { useState, useEffect, useRef } from 'react'
import {
    BugAntIcon,
    FireIcon,
    ChatBubbleBottomCenterTextIcon,
    CodeBracketIcon,
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
}

interface Position {
    x: number
    y: number
}

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
    })

    // Visibility state - load from localStorage, hidden by default
    const [isVisible, setIsVisible] = useState(false)

    // Drag state - default position is a bit to the left (initialized after mount)
    const [position, setPosition] = useState<Position>({ x: 0, y: 16 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const dragHandleRef = useRef<HTMLDivElement>(null)
    const isFirstMount = useRef(true)
    const isFirstSettingsMount = useRef(true)
    const isFirstVisibilityMount = useRef(true)

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

    const toggleSetting = (key: keyof DebugSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null

    // Don't render if not visible
    if (!isVisible) return null

    return (
        <div
            className={`fixed z-[9999] flex items-center space-x-2 bg-gray-900/95 rounded-lg border border-gray-700 px-3 py-2 select-none ${isDragging ? '' : 'transition-all duration-200'}`}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            onMouseEnter={() => !isDragging && setIsHovered(true)}
            onMouseLeave={() => !isDragging && setIsHovered(false)}
        >
            <div
                ref={dragHandleRef}
                className="cursor-move hover:bg-gray-800 rounded p-1 -m-1 transition-colors"
                title="Drag to move · Hover to expand"
                onMouseDown={handleDragStart}
            >
                <BugAntIcon className="w-6 h-6 text-gray-400" />
            </div>

            {/* Firebase Tracker Toggle */}
            {shouldShowButton('showFirebaseTracker') && (
                <button
                    onClick={() => toggleSetting('showFirebaseTracker')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showFirebaseTracker
                            ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Firebase Call Tracker"
                >
                    <FireIcon className="w-3 h-3" />
                    <span className="text-xs">Firebase</span>
                </button>
            )}

            {/* Firebase Debug Toggle */}
            {shouldShowButton('showFirebaseDebug') && (
                <button
                    onClick={() => toggleSetting('showFirebaseDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showFirebaseDebug
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Auth Flow Logs"
                >
                    <span className="text-xs">Auth</span>
                </button>
            )}

            {/* Session Debug Toggle */}
            {shouldShowButton('showSessionDebug') && (
                <button
                    onClick={() => toggleSetting('showSessionDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showSessionDebug
                            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Session Logs"
                >
                    <span className="text-xs">Session</span>
                </button>
            )}

            {/* Guest Debug Toggle */}
            {shouldShowButton('showGuestDebug') && (
                <button
                    onClick={() => toggleSetting('showGuestDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showGuestDebug
                            ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Guest Logs"
                >
                    <span className="text-xs">Guest</span>
                </button>
            )}

            {/* Cache Debug Toggle */}
            {shouldShowButton('showCacheDebug') && (
                <button
                    onClick={() => toggleSetting('showCacheDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showCacheDebug
                            ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Cache Logs"
                >
                    <span className="text-xs">Cache</span>
                </button>
            )}

            {/* Toast Debug Toggle */}
            {shouldShowButton('showToastDebug') && (
                <button
                    onClick={() => toggleSetting('showToastDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showToastDebug
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Toast Debug"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-3 h-3" />
                    <span className="text-xs">Toast</span>
                </button>
            )}

            {/* API Results Toggle */}
            {shouldShowButton('showApiResults') && (
                <button
                    onClick={() => toggleSetting('showApiResults')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showApiResults
                            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle API Results Button"
                >
                    <CodeBracketIcon className="w-3 h-3" />
                    <span className="text-xs">API Results</span>
                </button>
            )}

            {/* Web Vitals Toggle */}
            {shouldShowButton('showWebVitals') && (
                <button
                    onClick={() => toggleSetting('showWebVitals')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showWebVitals
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Web Vitals HUD (Alt+Shift+V)"
                >
                    <span className="text-xs">Vitals</span>
                </button>
            )}

            {/* Test Notifications Toggle */}
            {shouldShowButton('showTestNotifications') && (
                <button
                    onClick={() => toggleSetting('showTestNotifications')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showTestNotifications
                            ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Test Notification Button"
                >
                    <span className="text-xs">TestNotif</span>
                </button>
            )}

            {/* UI Debug Toggle */}
            {shouldShowButton('showUIDebug') && (
                <button
                    onClick={() => toggleSetting('showUIDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showUIDebug
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle UI Interaction Logs (modals, infinite scroll, etc.)"
                >
                    <span className="text-xs">UI</span>
                </button>
            )}

            {/* Tracking Debug Toggle */}
            {shouldShowButton('showTrackingDebug') && (
                <button
                    onClick={() => toggleSetting('showTrackingDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showTrackingDebug
                            ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Interaction Tracking Logs"
                >
                    <span className="text-xs">Tracking</span>
                </button>
            )}

            {/* Notification Debug Toggle */}
            {shouldShowButton('showNotificationDebug') && (
                <button
                    onClick={() => toggleSetting('showNotificationDebug')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                        settings.showNotificationDebug
                            ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title="Toggle Notification System Logs"
                >
                    <span className="text-xs">Notif</span>
                </button>
            )}
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
