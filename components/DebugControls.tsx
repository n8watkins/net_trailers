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
    showToastDebug: boolean
    showApiResults: boolean
}

interface Position {
    x: number
    y: number
}

export default function DebugControls() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: false,
        showFirebaseDebug: false,
        showToastDebug: false,
        showApiResults: false,
    })

    // Drag state - default position is a bit to the left (initialized after mount)
    const [position, setPosition] = useState<Position>({ x: 0, y: 16 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const dragHandleRef = useRef<HTMLDivElement>(null)
    const isFirstMount = useRef(true)

    // Load settings from localStorage and initialize position
    useEffect(() => {
        const saved = localStorage.getItem('debugSettings')
        if (saved) {
            setSettings(JSON.parse(saved))
        }

        // Load saved position or set default based on window width
        const savedPosition = localStorage.getItem('debugPosition')
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition))
        } else {
            // Set default position based on window width
            setPosition({ x: window.innerWidth - 600, y: 16 })
        }
    }, [])

    // Save settings to localStorage
    useEffect(() => {
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

    // Handle drag start
    const handleMouseDown = (e: React.MouseEvent) => {
        if (dragHandleRef.current?.contains(e.target as Node)) {
            setIsDragging(true)
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            })
        }
    }

    // Handle dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
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

    const toggleSetting = (key: keyof DebugSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null

    return (
        <div
            className="fixed z-[9999] flex items-center space-x-2 bg-gray-900/95 rounded-lg border border-gray-700 px-3 py-2 select-none"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            onMouseDown={handleMouseDown}
        >
            <div
                ref={dragHandleRef}
                className="cursor-move hover:bg-gray-800 rounded p-1 -m-1 transition-colors"
                title="Drag to move"
            >
                <BugAntIcon className="w-4 h-4 text-gray-400" />
            </div>

            {/* Firebase Tracker Toggle */}
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

            {/* Firebase Debug Toggle */}
            <button
                onClick={() => toggleSetting('showFirebaseDebug')}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    settings.showFirebaseDebug
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
                title="Toggle Auth Flow Logs"
            >
                <span className="text-xs">Auth Flow Logs</span>
            </button>

            {/* Toast Debug Toggle */}
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

            {/* API Results Toggle */}
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
        </div>
    )
}

// Export a hook to use debug settings in other components
export function useDebugSettings() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: false,
        showFirebaseDebug: false,
        showToastDebug: false,
        showApiResults: false,
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
