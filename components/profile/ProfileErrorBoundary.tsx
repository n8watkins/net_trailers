/**
 * Error Boundary for Profile Sections
 *
 * Gracefully handles errors in profile sections without crashing the entire page
 */

'use client'

import { Component, ReactNode } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
    children: ReactNode
    sectionName?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ProfileErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ProfileErrorBoundary] Error caught:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Error Loading {this.props.sectionName || 'Section'}
                        </h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                        We encountered an error while loading this section. Please try refreshing
                        the page.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-4 text-xs text-gray-500">
                            <summary className="cursor-pointer hover:text-gray-400">
                                Error Details (Development Only)
                            </summary>
                            <pre className="mt-2 p-3 bg-black/30 rounded overflow-x-auto">
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
