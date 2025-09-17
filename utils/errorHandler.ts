import { SetterOrUpdater } from 'recoil'
import { AppError } from '../atoms/errorAtom'

export class ErrorHandler {
    private setErrors: SetterOrUpdater<AppError[]>

    constructor(setErrors: SetterOrUpdater<AppError[]>) {
        this.setErrors = setErrors
    }

    addError(type: AppError['type'], message: string, details?: string): string {
        const error: AppError = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            details,
            timestamp: Date.now(),
        }

        this.setErrors(prev => [...prev, error])

        // Auto-dismiss after 5 seconds for non-critical errors
        if (type !== 'auth') {
            setTimeout(() => this.dismissError(error.id), 5000)
        }

        return error.id
    }

    dismissError(errorId: string): void {
        this.setErrors(prev => prev.filter(error => error.id !== errorId))
    }

    clearAllErrors(): void {
        this.setErrors([])
    }

    handleAuthError(error: any): string {
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

        const message = errorMessages[error.code] || error.message || 'An authentication error occurred.'
        return this.addError('auth', message, error.code)
    }

    handleApiError(error: any, context: string): string {
        let message = `Failed to ${context}. Please try again.`

        if (error.status === 429) {
            message = 'Too many requests. Please wait a moment and try again.'
        } else if (error.status >= 500) {
            message = 'Server error. Our team has been notified.'
        } else if (error.status === 404) {
            message = `${context} not found.`
        } else if (error.status === 403) {
            message = 'Access denied. Please check your permissions.'
        } else if (!navigator.onLine) {
            message = 'No internet connection. Please check your network.'
        }

        return this.addError('api', message, `${context} - ${error.status || 'Network Error'}`)
    }

    handleNetworkError(context: string): string {
        const message = 'Network error. Please check your internet connection and try again.'
        return this.addError('network', message, context)
    }

    handleValidationError(field: string, message: string): string {
        return this.addError('validation', `${field}: ${message}`)
    }

    // Success message helper
    addSuccess(message: string): string {
        // We'll treat success as a special type of "auth" error with positive messaging
        const successError: AppError = {
            id: `success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'auth',
            message,
            timestamp: Date.now(),
        }

        this.setErrors(prev => [...prev, successError])

        // Auto-dismiss success messages after 3 seconds
        setTimeout(() => this.dismissError(successError.id), 3000)

        return successError.id
    }
}

// Utility function to create error handler
export function createErrorHandler(setErrors: SetterOrUpdater<AppError[]>): ErrorHandler {
    return new ErrorHandler(setErrors)
}