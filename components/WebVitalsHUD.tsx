import { useState, useEffect } from 'react'

interface WebVital {
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    timestamp: number
}

/**
 * Visual HUD for Web Vitals metrics
 * Shows real-time performance metrics in development
 *
 * Toggle with Alt+Shift+V
 */
export default function WebVitalsHUD() {
    const [vitals, setVitals] = useState<Record<string, WebVital>>({})
    const [isVisible, setIsVisible] = useState(false)
    const isDev = process.env.NODE_ENV === 'development'

    useEffect(() => {
        if (!isDev) return

        // Keyboard shortcut to toggle: Alt+Shift+V
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.key === 'V') {
                e.preventDefault() // Prevent any default browser behavior
                setIsVisible((prev) => !prev)
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        // Listen for web vitals updates
        const handleWebVital = (event: CustomEvent) => {
            const metric = event.detail
            setVitals((prev) => ({
                ...prev,
                [metric.name]: {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating,
                    timestamp: Date.now(),
                },
            }))
        }

        window.addEventListener('web-vital' as any, handleWebVital)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('web-vital' as any, handleWebVital)
        }
    }, [isDev])

    if (!isDev) return null

    const getRatingColor = (rating: string) => {
        switch (rating) {
            case 'good':
                return 'bg-green-500'
            case 'needs-improvement':
                return 'bg-yellow-500'
            case 'poor':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getRatingTextColor = (rating: string) => {
        switch (rating) {
            case 'good':
                return 'text-green-400'
            case 'needs-improvement':
                return 'text-yellow-400'
            case 'poor':
                return 'text-red-400'
            default:
                return 'text-gray-400'
        }
    }

    const formatValue = (name: string, value: number) => {
        if (name === 'CLS') {
            return value.toFixed(3)
        }
        return `${Math.round(value)}ms`
    }

    const getMetricDescription = (name: string) => {
        const descriptions: Record<string, string> = {
            CLS: 'Cumulative Layout Shift',
            FCP: 'First Contentful Paint',
            FID: 'First Input Delay',
            INP: 'Interaction to Next Paint',
            LCP: 'Largest Contentful Paint',
            TTFB: 'Time to First Byte',
            'Next.js-hydration': 'Next.js Hydration Time',
            'Next.js-route-change-to-render': 'Next.js Route Change',
            'Next.js-render': 'Next.js Render Time',
        }
        return descriptions[name] || name
    }

    if (!isVisible) return null

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl border border-white/20 font-mono text-xs transition-all duration-200"
            style={{ maxWidth: '400px' }}
        >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                <h3 className="text-sm font-bold">Web Vitals</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/60 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                    aria-label="Close Web Vitals HUD"
                >
                    
                </button>
            </div>

            {Object.keys(vitals).length === 0 ? (
                <p className="text-white/60">Waiting for metrics...</p>
            ) : (
                <div className="space-y-2">
                    {Object.values(vitals)
                        .sort((a, b) => {
                            // Sort by Core Web Vitals first, then Next.js metrics, then others
                            const order = [
                                'LCP',
                                'INP',
                                'CLS',
                                'FCP',
                                'TTFB',
                                'FID',
                                'Next.js-hydration',
                                'Next.js-route-change-to-render',
                                'Next.js-render',
                            ]
                            return order.indexOf(a.name) - order.indexOf(b.name)
                        })
                        .map((vital) => (
                            <div
                                key={vital.name}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-2 h-2 rounded-full ${getRatingColor(vital.rating)}`}
                                        />
                                        <span className="font-semibold">{vital.name}</span>
                                    </div>
                                    <div className="text-[10px] text-white/50 ml-4">
                                        {getMetricDescription(vital.name)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div
                                        className={`font-bold ${getRatingTextColor(vital.rating)}`}
                                    >
                                        {formatValue(vital.name, vital.value)}
                                    </div>
                                    <div className="text-[10px] text-white/50 capitalize">
                                        {vital.rating.replace('-', ' ')}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            <div className="mt-3 pt-2 border-t border-white/20 text-[10px] text-white/40">
                Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Alt+Shift+V</kbd> to toggle
            </div>
        </div>
    )
}
