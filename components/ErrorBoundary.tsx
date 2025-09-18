import React, { Component, ErrorInfo, ReactNode } from 'react'
import NetflixError from './NetflixError'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error to console or error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleRetry = () => {
        // Reset the error boundary state
        this.setState({ hasError: false, error: undefined })

        // Reload the page to get fresh data
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            // Render custom fallback UI or default NetflixError
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <NetflixError
                    onRetry={this.handleRetry}
                />
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary