import { useState, useEffect } from 'react'
import { BugAntIcon, FireIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'

interface DebugSettings {
    showFirebaseTracker: boolean
    showFirebaseDebug: boolean
    showToastDebug: boolean
}

export default function DebugControls() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: true,
        showFirebaseDebug: false,
        showToastDebug: false,
    })

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('debugSettings')
        if (saved) {
            setSettings(JSON.parse(saved))
        }
    }, [])

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('debugSettings', JSON.stringify(settings))
        // Dispatch event for other components to listen to
        window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
    }, [settings])

    const toggleSetting = (key: keyof DebugSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null

    return (
        <div className="fixed top-4 right-20 z-[9999] flex items-center space-x-2 bg-gray-900/95 rounded-lg border border-gray-700 px-3 py-2">
            <BugAntIcon className="w-4 h-4 text-gray-400" />

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
                title="Toggle Firebase Console Debug"
            >
                <span className="text-xs">Console</span>
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
        </div>
    )
}

// Export a hook to use debug settings in other components
export function useDebugSettings() {
    const [settings, setSettings] = useState<DebugSettings>({
        showFirebaseTracker: true,
        showFirebaseDebug: false,
        showToastDebug: false,
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
