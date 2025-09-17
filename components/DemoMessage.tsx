import { useRecoilState } from 'recoil'
import { showDemoMessageState } from '../atoms/userDataAtom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import useUserData from '../hooks/useUserData'
import { useRouter } from 'next/router'

export default function DemoMessage() {
    const [showDemoMessage, setShowDemoMessage] = useRecoilState(showDemoMessageState)
    const { isGuest, isAuthenticated } = useUserData()
    const [visible, setVisible] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Only show on homepage after login, not on login/signup pages
        const isOnAuthPage = router.pathname === '/login' || router.pathname === '/signup' || router.pathname === '/reset'

        if (showDemoMessage && (isGuest || isAuthenticated) && !isOnAuthPage) {
            setVisible(true)
            const timer = setTimeout(() => {
                setVisible(false)
                setTimeout(() => setShowDemoMessage(false), 300) // Allow fade out
            }, 4000)

            return () => clearTimeout(timer)
        }
    }, [showDemoMessage, isGuest, isAuthenticated, setShowDemoMessage, router.pathname])

    const isOnAuthPage = router.pathname === '/login' || router.pathname === '/signup' || router.pathname === '/reset'

    if (!showDemoMessage || (!isGuest && !isAuthenticated) || isOnAuthPage) return null

    return (
        <div className={`fixed top-20 right-4 z-50 max-w-sm transition-all duration-300 ${
            visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
        }`}>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg border border-purple-500/20">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">🎬</span>
                            <h3 className="font-semibold text-sm">NetTrailer Demo</h3>
                        </div>

                        {isGuest ? (
                            <div className="text-xs space-y-1">
                                <p>You&apos;re in <strong>Guest Mode</strong>!</p>
                                <p>• Rate movies with 👍 👎 ❤️</p>
                                <p>• Add to watchlist</p>
                                <p>• Data saved locally</p>
                                <p className="text-purple-200">Create account to sync across devices!</p>
                            </div>
                        ) : (
                            <div className="text-xs space-y-1">
                                <p>Welcome to <strong>NetTrailer</strong>!</p>
                                <p>This is a portfolio project showcasing:</p>
                                <p>• Next.js + TypeScript + Firebase</p>
                                <p>• Movie ratings & watchlist features</p>
                                <p>• Professional authentication system</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setVisible(false)
                            setTimeout(() => setShowDemoMessage(false), 300)
                        }}
                        className="ml-2 text-white/70 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}