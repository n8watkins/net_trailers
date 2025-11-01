/**
 * Unified error handler that converts all application errors into toast notifications
 * Integrates with the main toast system instead of managing separate error state
 * Handles authentication, API, network, and validation errors consistently
 */

export interface AuthError {
    code: string
    message?: string
}

export interface ApiError {
    status?: number
    message?: string
}
export class ErrorHandler {
    private showError: (title: string, message?: string) => void

    constructor(showError: (title: string, message?: string) => void) {
        this.showError = showError
    }

    addError(type: string, message: string, details?: string): string {
        const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.showError(message, details)
        return id
    }

    handleAuthError(error: AuthError): string {
        const errorMessages: Record<string, string> = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Invalid password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/popup-closed-by-user': 'Sign-in was cancelled.',
            'auth/cancelled-popup-request': 'Sign-in was cancelled.',
        }

        const message =
            errorMessages[error.code] || error.message || 'An authentication error occurred.'
        this.showError(message, error.code)
        return 'auth_error'
    }

    handleApiError(error: ApiError, context: string): string {
        let message = `Failed to ${context}. Please try again.`

        if (error.status === 429) {
            message = 'Too many requests. Please wait a moment and try again.'
        } else if (error.status && error.status >= 500) {
            message = 'Server error. Our team has been notified.'
        } else if (error.status === 404) {
            message = `${context} not found.`
        } else if (error.status === 403) {
            message = 'Access denied. Please check your permissions.'
        } else if (!navigator.onLine) {
            message = 'No internet connection. Please check your network.'
        }

        this.showError(message, `${context} - ${error.status || 'Network Error'}`)
        return 'api_error'
    }

    handleNetworkError(context: string): string {
        const message = 'Network error. Please check your internet connection and try again.'
        this.showError(message, context)
        return 'network_error'
    }

    handleValidationError(field: string, message: string): string {
        this.showError(`${field}: ${message}`)
        return 'validation_error'
    }
}

/**
 * Factory function to create error handler with toast integration
 * Use this instead of constructing ErrorHandler directly
 *
 * Usage:
 *   const { showError } = useToast()
 *   const errorHandler = createErrorHandler(showError)
 */
export function createErrorHandler(
    showError: (title: string, message?: string) => void
): ErrorHandler {
    return new ErrorHandler(showError)
}
