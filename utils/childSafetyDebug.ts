/**
 * Child Safety Debug Logger
 * Enable by setting: localStorage.setItem('DEBUG_CHILD_SAFETY', 'true')
 */

const DEBUG_KEY = 'DEBUG_CHILD_SAFETY'

export function isChildSafetyDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        // Server-side: check environment variable
        return process.env.NODE_ENV === 'development' || process.env.DEBUG_CHILD_SAFETY === 'true'
    }
    // Client-side: check localStorage
    try {
        return localStorage.getItem(DEBUG_KEY) === 'true'
    } catch {
        return false
    }
}

export function enableChildSafetyDebug() {
    if (typeof window !== 'undefined') {
        localStorage.setItem(DEBUG_KEY, 'true')
        console.log('🔒 Child Safety Debug Mode ENABLED')
    }
}

export function disableChildSafetyDebug() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(DEBUG_KEY)
        console.log('🔒 Child Safety Debug Mode DISABLED')
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
