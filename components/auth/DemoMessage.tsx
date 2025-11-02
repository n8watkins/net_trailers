import { useAppStore } from '../../stores/appStore'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useRouter } from 'next/router'

export default function DemoMessage() {
    const showDemoMessage = useAppStore((state) => state.showDemoMessage)
    const setShowDemoMessage = useAppStore((state) => state.setShowDemoMessage)
    const contentLoadedSuccessfully = useAppStore((state) => state.contentLoadedSuccessfully)
    const { isGuest, isAuthenticated } = useAuthStatus()
    const [visible, setVisible] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Auto-loading disabled - DemoMessage now only shows via Tutorial in dropdown
        // Component kept for potential future manual triggers
        return
    }, [
        showDemoMessage,
        isGuest,
        isAuthenticated,
        setShowDemoMessage,
        router.pathname,
        contentLoadedSuccessfully,
    ])

    const isOnAuthPage = router.pathname === '/auth' || router.pathname === '/reset'

    if (
        !showDemoMessage ||
        (!isGuest && !isAuthenticated) ||
        isOnAuthPage ||
        !contentLoadedSuccessfully
    )
        return null

    return (
        <div
            className={`fixed top-16 right-4 z-50 max-w-lg transition-all duration-500 ${
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            }`}
        >
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#181818] text-white p-8 rounded-2xl shadow-2xl border-2 border-[#e50914]/40 backdrop-blur-md relative">
                {/* Close button in top right corner */}
                <button
                    onClick={() => {
                        setVisible(false)
                        setTimeout(() => setShowDemoMessage(false), 300)
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="flex items-start justify-between pr-8">
                    <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-10 h-10 bg-[#e50914] rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl font-bold">N</span>
                            </div>
                            <h3 className="font-bold text-xl text-white">Net Trailers</h3>
                        </div>

                        {isGuest ? (
                            <div className="text-base space-y-3">
                                <p className="text-[#ff6b6b] font-bold text-lg">
                                    🚀 Guest Mode Active
                                </p>
                                <div className="space-y-2 text-gray-100">
                                    <p className="text-base">• Rate movies with 👍 👎 ❤️</p>
                                    <p className="text-base">• Build your personal watchlist</p>
                                    <p className="text-base">• Browse unlimited content</p>
                                    <p className="text-base">• Data saved locally</p>
                                </div>
                                <div className="mt-4 p-3 bg-[#333]/50 rounded-lg border border-[#f5c518]/30">
                                    <p className="text-[#f5c518] text-sm font-semibold">
                                        💡 Create account to sync across devices!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-base space-y-3">
                                <p className="text-[#ff6b6b] font-bold text-lg">
                                    🎯 Welcome to Net Trailers!
                                </p>
                                <p className="text-gray-100 text-sm font-medium">
                                    Portfolio project showcasing:
                                </p>
                                <div className="space-y-2 text-gray-100">
                                    <p className="text-base">• Next.js + TypeScript + Firebase</p>
                                    <p className="text-base">• Movie ratings & watchlist system</p>
                                    <p className="text-base">• Professional authentication</p>
                                    <p className="text-base">• Real-time data synchronization</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
