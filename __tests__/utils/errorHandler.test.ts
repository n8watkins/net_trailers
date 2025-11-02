import { createErrorHandler, ErrorHandler } from '../../utils/errorHandler'

describe('ErrorHandler', () => {
    let mockShowError: jest.Mock
    let errorHandler: ErrorHandler

    beforeEach(() => {
        mockShowError = jest.fn()
        errorHandler = createErrorHandler(mockShowError)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('addError', () => {
        it('should call showError with the message', () => {
            const errorId = errorHandler.addError('auth', 'Invalid credentials')

            expect(mockShowError).toHaveBeenCalledWith('Invalid credentials', undefined)
            expect(errorId).toMatch(/^auth_\d+_[a-z0-9]+$/)
        })

        it('should call showError with message and details', () => {
            const errorId = errorHandler.addError(
                'auth',
                'Invalid credentials',
                'Additional details'
            )

            expect(mockShowError).toHaveBeenCalledWith('Invalid credentials', 'Additional details')
            expect(errorId).toMatch(/^auth_\d+_[a-z0-9]+$/)
        })

        it('should generate unique IDs for multiple errors', () => {
            const id1 = errorHandler.addError('auth', 'Error 1')
            const id2 = errorHandler.addError('auth', 'Error 2')

            expect(mockShowError).toHaveBeenCalledTimes(2)
            expect(id1).not.toBe(id2)
        })
    })

    describe('handleAuthError', () => {
        it('should handle auth/user-not-found error', () => {
            const authError = {
                code: 'auth/user-not-found',
                message: 'There is no user record corresponding to this identifier.',
            }

            const errorId = errorHandler.handleAuthError(authError)

            expect(mockShowError).toHaveBeenCalledWith(
                'No account found with this email address.',
                'auth/user-not-found'
            )
            expect(errorId).toBe('auth_error')
        })

        it('should handle auth/email-already-in-use error', () => {
            const authError = {
                code: 'auth/email-already-in-use',
                message: 'The email address is already in use by another account.',
            }

            errorHandler.handleAuthError(authError)

            expect(mockShowError).toHaveBeenCalledWith(
                'An account with this email already exists.',
                'auth/email-already-in-use'
            )
        })

        it('should handle unknown auth errors with fallback message', () => {
            const unknownError = {
                code: 'auth/unknown-error',
                message: 'An unknown error occurred.',
            }

            errorHandler.handleAuthError(unknownError)

            expect(mockShowError).toHaveBeenCalledWith(
                'An unknown error occurred.',
                'auth/unknown-error'
            )
        })

        it('should handle errors without code property', () => {
            const errorWithoutCode = {
                message: 'Something went wrong',
                code: undefined,
            }

            errorHandler.handleAuthError(errorWithoutCode as any)

            expect(mockShowError).toHaveBeenCalledWith('Something went wrong', undefined)
        })
    })

    describe('handleApiError', () => {
        it('should handle 429 status code', () => {
            const apiError = { status: 429 }

            const errorId = errorHandler.handleApiError(apiError, 'fetch data')

            expect(mockShowError).toHaveBeenCalledWith(
                'Too many requests. Please wait a moment and try again.',
                'fetch data - 429'
            )
            expect(errorId).toBe('api_error')
        })

        it('should handle 500+ status codes', () => {
            const apiError = { status: 500 }

            errorHandler.handleApiError(apiError, 'save data')

            expect(mockShowError).toHaveBeenCalledWith(
                'Server error. Our team has been notified.',
                'save data - 500'
            )
        })

        it('should handle network errors', () => {
            // Mock navigator.onLine to be false
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            })

            const apiError = {}

            errorHandler.handleApiError(apiError, 'load page')

            expect(mockShowError).toHaveBeenCalledWith(
                'No internet connection. Please check your network.',
                'load page - Network Error'
            )

            // Restore navigator.onLine
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            })
        })
    })

    describe('handleNetworkError', () => {
        it('should call showError with network error message and context', () => {
            const errorId = errorHandler.handleNetworkError('API call failed')

            expect(mockShowError).toHaveBeenCalledWith(
                'Network error. Please check your internet connection and try again.',
                'API call failed'
            )
            expect(errorId).toBe('network_error')
        })
    })

    describe('handleValidationError', () => {
        it('should call showError with validation error message', () => {
            const errorId = errorHandler.handleValidationError('email', 'Invalid email format')

            expect(mockShowError).toHaveBeenCalledWith('email: Invalid email format')
            expect(errorId).toBe('validation_error')
        })
    })

    // dismissError and clearAllErrors methods removed - error dismissal now handled by toast system
})
