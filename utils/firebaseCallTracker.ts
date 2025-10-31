/**
 * Firebase Call Tracker - Debug utility to monitor excessive Firebase calls
 * This helps identify sources of quota exhaustion
 */

import { firebaseLog, firebaseWarn, firebaseGroup, firebaseGroupEnd } from './debugLogger'

interface CallInfo {
    operation: string
    source: string
    timestamp: number
    userId?: string
    data?: any
}

class FirebaseCallTracker {
    private calls: CallInfo[] = []
    private callCounts: Map<string, number> = new Map()
    private windowStartTime: number = Date.now()
    private readonly WINDOW_SIZE = 60000 // 1 minute window
    private readonly WARNING_THRESHOLD = 10 // Warn if more than 10 calls in a minute

    track(operation: string, source: string, userId?: string, data?: any) {
        const now = Date.now()

        // Clean up old calls outside the window
        this.calls = this.calls.filter((call) => now - call.timestamp < this.WINDOW_SIZE)

        // Add new call
        const callInfo: CallInfo = {
            operation,
            source,
            timestamp: now,
            userId,
            data,
        }
        this.calls.push(callInfo)

        // Update counts
        const key = `${operation}:${source}`
        this.callCounts.set(key, (this.callCounts.get(key) || 0) + 1)

        // Log the call with context
        firebaseLog(`🔥 [Firebase] ${operation} from ${source}`, {
            userId,
            totalCalls: this.calls.length,
            callsInWindow: this.getCallsInWindow(),
            ...(data && { data }),
        })

        // Check for excessive calls
        this.checkForExcessiveCalls()
    }

    private getCallsInWindow(): number {
        const now = Date.now()
        return this.calls.filter((call) => now - call.timestamp < this.WINDOW_SIZE).length
    }

    private checkForExcessiveCalls() {
        const callsInWindow = this.getCallsInWindow()

        if (callsInWindow > this.WARNING_THRESHOLD) {
            firebaseWarn(
                `⚠️ [Firebase] EXCESSIVE CALLS DETECTED: ${callsInWindow} calls in the last minute!`
            )
            this.printCallSummary()
        }

        // Check for duplicate calls
        this.checkForDuplicates()
    }

    private checkForDuplicates() {
        const recentCalls = this.calls.slice(-10) // Check last 10 calls
        const duplicates = new Map<string, number>()

        recentCalls.forEach((call) => {
            const key = `${call.operation}:${call.source}:${call.userId || 'guest'}`
            duplicates.set(key, (duplicates.get(key) || 0) + 1)
        })

        duplicates.forEach((count, key) => {
            if (count > 2) {
                firebaseWarn(
                    `⚠️ [Firebase] DUPLICATE CALLS: "${key}" called ${count} times in quick succession`
                )
            }
        })
    }

    printCallSummary() {
        firebaseGroup('📊 Firebase Call Summary')
        firebaseLog('Total calls tracked:', this.calls.length)
        firebaseLog('Calls in last minute:', this.getCallsInWindow())

        // Group by operation
        const byOperation = new Map<string, number>()
        this.calls.forEach((call) => {
            byOperation.set(call.operation, (byOperation.get(call.operation) || 0) + 1)
        })

        firebaseLog('By Operation:')
        byOperation.forEach((count, op) => {
            firebaseLog(`  ${op}: ${count}`)
        })

        // Group by source
        const bySource = new Map<string, number>()
        this.calls.forEach((call) => {
            bySource.set(call.source, (bySource.get(call.source) || 0) + 1)
        })

        firebaseLog('By Source:')
        bySource.forEach((count, src) => {
            firebaseLog(`  ${src}: ${count}`)
        })

        // Show recent calls
        firebaseLog('Recent calls:')
        this.calls.slice(-5).forEach((call) => {
            firebaseLog(
                `  ${new Date(call.timestamp).toLocaleTimeString()}: ${call.operation} from ${call.source}`
            )
        })

        firebaseGroupEnd()
    }

    reset() {
        this.calls = []
        this.callCounts.clear()
        this.windowStartTime = Date.now()
        firebaseLog('🔄 Firebase call tracker reset')
    }

    getStats() {
        return {
            totalCalls: this.calls.length,
            callsInWindow: this.getCallsInWindow(),
            topOperations: Array.from(this.callCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            oldestCall: this.calls[0]?.timestamp,
            newestCall: this.calls[this.calls.length - 1]?.timestamp,
        }
    }
}

// Global instance
export const firebaseTracker = new FirebaseCallTracker()

// Attach to window for console debugging
if (typeof window !== 'undefined') {
    ;(window as any).firebaseTracker = firebaseTracker
}
