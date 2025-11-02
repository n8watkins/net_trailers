import { useState, useEffect } from 'react'
import { useDebugSettings } from '../debug/DebugControls'

interface WebVital {
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    timestamp: number
}

// Web Vitals thresholds
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    FID: { good: 100, poor: 300 },
    INP: { good: 200, poor: 500 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name]
    if (!threshold) return 'good'
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
}

/**
 * Visual HUD for Web Vitals metrics
 * Shows real-time performance metrics in development
 *
 * Toggle with Alt+Shift+V or from Debug Console
 */
export default function WebVitalsHUD() {
    const [vitals, setVitals] = useState<Record<string, WebVital>>({})
    const debugSettings = useDebugSettings()
    const isDev = process.env.NODE_ENV === 'development'

    // Sync visibility with debug settings
    const isVisible = debugSettings.showWebVitals

    // Update localStorage debug settings when keyboard shortcut or close button is used
    const toggleVisibility = () => {
        const saved = localStorage.getItem('debugSettings')
        const currentSettings = saved ? JSON.parse(saved) : {}
        const newSettings = { ...currentSettings, showWebVitals: !debugSettings.showWebVitals }
        localStorage.setItem('debugSettings', JSON.stringify(newSettings))
        window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: newSettings }))
    }

    useEffect(() => {
        if (!isDev) return

        // Keyboard shortcut to toggle: Alt+Shift+V
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.key === 'V') {
                e.preventDefault() // Prevent any default browser behavior
                toggleVisibility()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        // Listen for web vitals updates from reportWebVitals
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

        // DIRECT INTEGRATION: Import and use web-vitals library directly
        // This ensures metrics are captured even if Next.js reportWebVitals isn't called
        const loadWebVitals = async () => {
            try {
                const { onCLS, onFCP, onINP, onLCP, onTTFB, onFID } = await import('web-vitals')

                const handleMetric = (metric: any) => {
                    const rating = getRating(metric.name, metric.value)
                    setVitals((prev) => ({
                        ...prev,
                        [metric.name]: {
                            name: metric.name,
                            value: metric.value,
                            rating,
                            timestamp: Date.now(),
                        },
                    }))
                }

                onCLS(handleMetric)
                onFCP(handleMetric)
                onINP(handleMetric)
                onLCP(handleMetric)
                onTTFB(handleMetric)
                onFID(handleMetric)
            } catch (error) {
                console.error('[WebVitalsHUD] Error loading web-vitals:', error)
            }
        }

        loadWebVitals()

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
                    onClick={toggleVisibility}
                    className="text-white/60 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                    aria-label="Close Web Vitals HUD"
                >
                    ✕
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
