'use client'

import { Analytics } from '@vercel/analytics/next'
import { useDebugSettings } from '../debug/DebugControls'

/**
 * Wrapper for Vercel Analytics that respects debug settings
 * Debug mode is only enabled when showWebVitals is true
 */
export default function VercelAnalyticsWrapper() {
    const debugSettings = useDebugSettings()
    const isDev = process.env.NODE_ENV === 'development'

    // In development, only show debug logs if showWebVitals is enabled
    const debug = isDev && debugSettings.showWebVitals

    return <Analytics debug={debug} />
}
