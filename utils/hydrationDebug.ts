/**
 * Hydration Debugging Utility
 * Tracks component lifecycle and hydration timing to identify mismatches
 */

export interface HydrationEvent {
    timestamp: number
    component: string
    phase: 'mount' | 'render' | 'effect' | 'store-access' | 'state-change'
    isClient: boolean
    details?: any
}

class HydrationDebugger {
    private events: HydrationEvent[] = []
    private startTime: number
    private isEnabled: boolean = true

    constructor() {
        this.startTime = typeof window !== 'undefined' ? performance.now() : 0

        if (typeof window !== 'undefined') {
            ;(window as any).__HYDRATION_DEBUG__ = this
        }
    }

    log(component: string, phase: HydrationEvent['phase'], details?: any) {
        if (!this.isEnabled) return

        const event: HydrationEvent = {
            timestamp: typeof window !== 'undefined' ? performance.now() - this.startTime : 0,
            component,
            phase,
            isClient: typeof window !== 'undefined',
            details,
        }

        this.events.push(event)

        // Console output with color coding
        const color = this.getColorForPhase(phase)
        const timeStr = event.timestamp.toFixed(2).padStart(8, ' ')
        const clientStr = event.isClient ? 'CLIENT' : 'SERVER'

        console.log(
            `%c[${timeStr}ms] [${clientStr}] ${component} - ${phase}`,
            `color: ${color}; font-weight: ${phase === 'store-access' ? 'bold' : 'normal'}`,
            details || ''
        )

        // Detect potential hydration issues
        if (phase === 'store-access' && !event.isClient) {
            console.warn(`⚠️ POTENTIAL ISSUE: Store accessed during SSR in ${component}`, details)
        }

        if (phase === 'state-change' && event.timestamp < 100) {
            console.warn(
                `⚠️ POTENTIAL ISSUE: Early state change in ${component} at ${timeStr}ms`,
                details
            )
        }
    }

    private getColorForPhase(phase: HydrationEvent['phase']): string {
        switch (phase) {
            case 'mount':
                return '#4CAF50'
            case 'render':
                return '#2196F3'
            case 'effect':
                return '#FF9800'
            case 'store-access':
                return '#f44336'
            case 'state-change':
                return '#9C27B0'
            default:
                return '#757575'
        }
    }

    getEvents(): HydrationEvent[] {
        return this.events
    }

    analyzeSequence() {
        console.group('🔍 Hydration Sequence Analysis')

        // Group events by component
        const byComponent = this.events.reduce(
            (acc, event) => {
                if (!acc[event.component]) {
                    acc[event.component] = []
                }
                acc[event.component].push(event)
                return acc
            },
            {} as Record<string, HydrationEvent[]>
        )

        // Analyze each component
        Object.entries(byComponent).forEach(([component, events]) => {
            console.group(`📦 ${component}`)

            // Check for SSR store access
            const ssrStoreAccess = events.filter((e) => e.phase === 'store-access' && !e.isClient)
            if (ssrStoreAccess.length > 0) {
                console.error(`❌ SSR Store Access Detected (${ssrStoreAccess.length} times)`)
                ssrStoreAccess.forEach((e) =>
                    console.log(`  - at ${e.timestamp.toFixed(2)}ms:`, e.details)
                )
            }

            // Check for early state changes
            const earlyStateChanges = events.filter(
                (e) => e.phase === 'state-change' && e.timestamp < 100
            )
            if (earlyStateChanges.length > 0) {
                console.warn(`⚠️ Early State Changes (${earlyStateChanges.length})`)
                earlyStateChanges.forEach((e) =>
                    console.log(`  - at ${e.timestamp.toFixed(2)}ms:`, e.details)
                )
            }

            // Show timeline
            console.log('📊 Timeline:')
            events.forEach((e) => {
                const icon = this.getIconForPhase(e.phase)
                console.log(
                    `  ${icon} ${e.timestamp.toFixed(2)}ms: ${e.phase} (${e.isClient ? 'client' : 'server'})`
                )
            })

            console.groupEnd()
        })

        // Find components that render differently on server vs client
        const suspectComponents = Object.entries(byComponent).filter(([_, events]) => {
            const serverRenders = events.filter((e) => e.phase === 'render' && !e.isClient)
            const clientRenders = events.filter((e) => e.phase === 'render' && e.isClient)
            return serverRenders.length > 0 && clientRenders.length > 0
        })

        if (suspectComponents.length > 0) {
            console.warn(
                '🚨 Components with server/client renders:',
                suspectComponents.map(([name]) => name)
            )
        }

        console.groupEnd()
    }

    private getIconForPhase(phase: HydrationEvent['phase']): string {
        switch (phase) {
            case 'mount':
                return '🔧'
            case 'render':
                return '🎨'
            case 'effect':
                return '⚡'
            case 'store-access':
                return '📦'
            case 'state-change':
                return '🔄'
            default:
                return '•'
        }
    }

    reset() {
        this.events = []
        this.startTime = typeof window !== 'undefined' ? performance.now() : 0
    }

    disable() {
        this.isEnabled = false
    }

    enable() {
        this.isEnabled = true
    }
}

// Global singleton instance
export const hydrationDebug = new HydrationDebugger()

// Helper hooks for React components
export function useHydrationDebug(componentName: string) {
    if (typeof window !== 'undefined') {
        hydrationDebug.log(componentName, 'mount')
    }

    return {
        logRender: (details?: any) => hydrationDebug.log(componentName, 'render', details),
        logEffect: (details?: any) => hydrationDebug.log(componentName, 'effect', details),
        logStoreAccess: (details?: any) =>
            hydrationDebug.log(componentName, 'store-access', details),
        logStateChange: (details?: any) =>
            hydrationDebug.log(componentName, 'state-change', details),
    }
}
