/**
 * Web Vitals metric interface
 * Note: Using string for name to support future metrics from React 19+
 */
interface WebVitalMetric {
    name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB' | string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    id: string
    delta: number
    navigationType: string
}

/**
 * Thresholds for Web Vitals metrics
 * Based on Google's recommended values
 */
const THRESHOLDS: Record<string, { good: number; poor: number } | undefined> = {
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    FID: { good: 100, poor: 300 },
    INP: { good: 200, poor: 500 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
}

/**
 * Check if Web Vitals debug logging is enabled
 */
function isWebVitalsDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false
    if (process.env.NODE_ENV !== 'development') return false

    try {
        const settings = localStorage.getItem('debugSettings')
        if (!settings) return false
        const parsed = JSON.parse(settings)
        return parsed.showWebVitals === true
    } catch {
        return false
    }
}

/**
 * Get the rating for a metric value
 */
function getRating(name: string, value: number): WebVitalMetric['rating'] {
    const threshold = THRESHOLDS[name]

    // Handle unknown metrics gracefully (React 19+ may introduce new metrics)
    if (!threshold) {
        if (isWebVitalsDebugEnabled()) {
            console.warn(`[Web Vitals] Unknown metric: ${name} (value: ${value})`)
        }
        return 'good' // Default to good for unknown metrics
    }

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
}

/**
 * Format metric value for display
 */
function formatValue(name: string, value: number): string {
    // CLS is unitless, others are in milliseconds
    if (name === 'CLS') {
        return value.toFixed(3)
    }
    return `${Math.round(value)}ms`
}

/**
 * Get emoji for rating
 */
function getRatingEmoji(rating: string): string {
    switch (rating) {
        case 'good':
            return '✅'
        case 'needs-improvement':
            return '⚠️'
        case 'poor':
            return '❌'
        default:
            return '❓'
    }
}

/**
 * Log web vital to console with formatting (development only)
 * Only logs when showWebVitals debug setting is enabled
 */
function logWebVital(metric: WebVitalMetric) {
    // Only log if Web Vitals debugging is enabled
    if (!isWebVitalsDebugEnabled()) return

    const rating = metric.rating || getRating(metric.name, metric.value)
    const emoji = getRatingEmoji(rating)
    const formattedValue = formatValue(metric.name, metric.value)

    // Color-coded console output
    const styles = {
        good: 'color: #10b981; font-weight: bold', // Green-500
        'needs-improvement': 'color: #f59e0b; font-weight: bold', // Amber-500
        poor: 'color: #ef4444; font-weight: bold', // Red-500
    }

    console.log(
        `%c${emoji} ${metric.name}: ${formattedValue} (${rating})`,
        styles[rating] || 'color: #888'
    )

    // Detailed info table (only when debugging)
    console.table({
        Metric: metric.name,
        Value: formattedValue,
        Rating: rating,
        Delta: formatValue(metric.name, metric.delta),
        ID: metric.id,
        Navigation: metric.navigationType,
    })
}

/**
 * Report web vitals to console and dispatch event for HUD (development only)
 */
export function reportWebVitals(metric: WebVitalMetric) {
    // Log to console (only in development)
    logWebVital(metric)

    // Dispatch custom event for WebVitalsHUD component
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('web-vital', {
                detail: {
                    name: metric.name,
                    value: metric.value,
                    rating: metric.rating || getRating(metric.name, metric.value),
                    id: metric.id,
                },
            })
        )
    }

    // In production, you could send to analytics here
    // Example: trackWebVital(metric)
}

/**
 * Get all web vitals thresholds
 */
export function getWebVitalsThresholds() {
    return THRESHOLDS
}
