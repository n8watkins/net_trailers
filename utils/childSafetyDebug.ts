/**
 * Child Safety Debug Logger
 * Controlled via DebugControls component (Alt+Shift+D)
 * Enable the "Child Safety" toggle in Features & Tools category
 */

// Get debug settings from localStorage
function getDebugSettings() {
    if (typeof window === 'undefined') return null

    try {
        const settings = localStorage.getItem('debugSettings')
        if (!settings) return null
        return JSON.parse(settings)
    } catch {
        return null
    }
}

// Check if Child Safety debug is enabled
function isDebugEnabled(setting: string): boolean {
    const settings = getDebugSettings()
    return settings?.[setting] === true
}

export function isChildSafetyDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        // Server-side: disabled by default (client-only feature)
        return false
    }
    // Client-side: check main debug settings
    return process.env.NODE_ENV === 'development' && isDebugEnabled('showChildSafetyDebug')
}

export function enableChildSafetyDebug() {
    if (typeof window !== 'undefined') {
        const settings = getDebugSettings() || {}
        settings.showChildSafetyDebug = true
        localStorage.setItem('debugSettings', JSON.stringify(settings))
        window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
        console.log('🔒 Child Safety Debug Mode ENABLED (via main debug settings)')
    }
}

export function disableChildSafetyDebug() {
    if (typeof window !== 'undefined') {
        const settings = getDebugSettings() || {}
        settings.showChildSafetyDebug = false
        localStorage.setItem('debugSettings', JSON.stringify(settings))
        window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
        console.log('🔒 Child Safety Debug Mode DISABLED (via main debug settings)')
    }
}

export function csDebug(context: string, message: string, data?: any) {
    if (!isChildSafetyDebugEnabled()) return

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const prefix = `🔒 [${timestamp}] [${context}]`

    if (data !== undefined) {
        console.log(prefix, message, data)
    } else {
        console.log(prefix, message)
    }
}

export function csDebugRequest(url: string, params: Record<string, any>) {
    if (!isChildSafetyDebugEnabled()) return

    console.group('🔒 API REQUEST')
    console.log('URL:', url)
    console.log('Child Safety Mode:', params.childSafetyMode || false)
    console.log('Parameters:', params)
    console.groupEnd()
}

export function csDebugResponse(context: string, results: any[], childSafeMode: boolean) {
    if (!isChildSafetyDebugEnabled()) return

    console.group(`🔒 API RESPONSE - ${context}`)
    console.log('Child Safety Mode:', childSafeMode)
    console.log('Results Count:', results.length)

    if (results.length > 0) {
        console.log(
            'Sample (first 3):',
            results.slice(0, 3).map((r: any) => ({
                title: r.title || r.name,
                id: r.id,
                media_type: r.media_type,
                adult: r.adult,
                vote_average: r.vote_average,
            }))
        )
    }
    console.groupEnd()
}

export function csDebugTMDB(endpoint: string, childSafeMode: boolean) {
    if (!isChildSafetyDebugEnabled()) return

    // Sanitize API key from URL
    const sanitized = endpoint.replace(/api_key=[^&]+/, 'api_key=[REDACTED]')

    console.group('🔒 TMDB API CALL')
    console.log('Child Safety Mode:', childSafeMode)
    console.log('Endpoint:', sanitized)
    console.log('Has certification filter:', endpoint.includes('certification'))
    console.groupEnd()
}

export function csDebugFilter(beforeCount: number, afterCount: number, filterType: string) {
    if (!isChildSafetyDebugEnabled()) return

    const filtered = beforeCount - afterCount
    const percent = beforeCount > 0 ? ((filtered / beforeCount) * 100).toFixed(1) : 0

    console.log(
        `🔒 FILTER APPLIED [${filterType}]: ${beforeCount} → ${afterCount} (${filtered} filtered, ${percent}%)`
    )
}

// Global debug helpers (available in browser console)
if (typeof window !== 'undefined') {
    ;(window as any).childSafetyDebug = {
        enable: enableChildSafetyDebug,
        disable: disableChildSafetyDebug,
        isEnabled: isChildSafetyDebugEnabled,
    }
}
