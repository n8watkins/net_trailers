import { createErrorHandler, ErrorHandler } from '../../utils/errorHandler'

describe('ErrorHandler', () => {
    let mockSetErrors: jest.Mock
    let errorHandler: ErrorHandler

    beforeEach(() => {
        mockSetErrors = jest.fn()
        errorHandler = createErrorHandler(mockSetErrors)
        jest.clearAllTimers()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })

    describe('addError', () => {
        it('should add a new error to the state', () => {
            const errorId = errorHandler.addError('auth', 'Invalid credentials')

            expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))
            expect(errorId).toMatch(/^auth_\d+_[a-z0-9]+$/)

            // Test the updater function
            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                id: expect.any(String),
                type: 'auth',
                message: 'Invalid credentials',
                timestamp: expect.any(Number),
            })
        })

        it('should generate unique IDs for multiple errors', () => {
            const id1 = errorHandler.addError('auth', 'Error 1')
            const id2 = errorHandler.addError('auth', 'Error 2')

            expect(mockSetErrors).toHaveBeenCalledTimes(2)
            expect(id1).not.toBe(id2)

            const firstUpdater = mockSetErrors.mock.calls[0][0]
            const secondUpdater = mockSetErrors.mock.calls[1][0]

            const firstResult = firstUpdater([])
            const secondResult = secondUpdater(firstResult)

            expect(secondResult).toHaveLength(2)
            expect(secondResult[0].id).not.toBe(secondResult[1].id)
        })

        it('should add errors without limiting to 5 (no built-in limit)', () => {
            // Start with 5 existing errors
            const existingErrors = Array.from({ length: 5 }, (_, i) => ({
                id: `error-${i}`,
                type: 'auth' as const,
                message: `Error ${i}`,
                timestamp: Date.now(),
            }))

            errorHandler.addError('auth', 'New error')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction(existingErrors)

            expect(result).toHaveLength(6) // No built-in limit in current implementation
            expect(result[5].message).toBe('New error') // New error added at end
        })

        it('should auto-dismiss non-auth errors after 5 seconds', () => {
            const errorId = errorHandler.addError('api', 'API error')

            expect(mockSetErrors).toHaveBeenCalledTimes(1)

            // Fast-forward time by 5 seconds
            jest.advanceTimersByTime(5000)

            // Should call dismissError after timeout
            expect(mockSetErrors).toHaveBeenCalledTimes(2)

            const dismissCall = mockSetErrors.mock.calls[1][0]
            const result = dismissCall([
                { id: errorId, type: 'api', message: 'API error', timestamp: Date.now() },
            ])
            expect(result).toHaveLength(0)
        })

        it('should not auto-dismiss auth errors', () => {
            errorHandler.addError('auth', 'Auth error')

            expect(mockSetErrors).toHaveBeenCalledTimes(1)

            // Fast-forward time by 5 seconds
            jest.advanceTimersByTime(5000)

            // Should not call dismissError for auth errors
            expect(mockSetErrors).toHaveBeenCalledTimes(1)
        })
    })

    describe('handleValidationError', () => {
        it('should add a validation error to the state', () => {
            const errorId = errorHandler.handleValidationError('email', 'Invalid email format')

            expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))
            expect(errorId).toMatch(/^validation_\d+_[a-z0-9]+$/)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                id: expect.any(String),
                type: 'validation',
                message: 'email: Invalid email format',
                timestamp: expect.any(Number),
            })
        })
    })

    describe('dismissError', () => {
        it('should remove an error by ID', () => {
            const existingErrors = [
                {
                    id: 'error-1',
                    type: 'auth' as const,
                    message: 'Error 1',
                    timestamp: Date.now(),
                },
                {
                    id: 'error-2',
                    type: 'auth' as const,
                    message: 'Error 2',
                    timestamp: Date.now(),
                },
            ]

            errorHandler.dismissError('error-1')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction(existingErrors)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('error-2')
        })

        it('should not modify state if error ID not found', () => {
            const existingErrors = [
                {
                    id: 'error-1',
                    type: 'auth' as const,
                    message: 'Error 1',
                    timestamp: Date.now(),
                },
            ]

            errorHandler.dismissError('nonexistent-id')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction(existingErrors)

            expect(result).toEqual(existingErrors)
        })
    })

    describe('clearAllErrors', () => {
        it('should clear all errors', () => {
            errorHandler.clearAllErrors()

            expect(mockSetErrors).toHaveBeenCalledWith([])
        })
    })

    describe('handleAuthError', () => {
        it('should handle auth/user-not-found error', () => {
            const authError = {
                code: 'auth/user-not-found',
                message: 'There is no user record corresponding to this identifier.',
            }

            const errorId = errorHandler.handleAuthError(authError)

            expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))
            expect(errorId).toMatch(/^auth_\d+_[a-z0-9]+$/)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'No account found with this email address.',
                details: 'auth/user-not-found',
            })
        })

        it('should handle auth/email-already-in-use error', () => {
            const authError = {
                code: 'auth/email-already-in-use',
                message: 'The email address is already in use by another account.',
            }

            errorHandler.handleAuthError(authError)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'An account with this email already exists.',
                details: 'auth/email-already-in-use',
            })
        })

        it('should handle auth/weak-password error', () => {
            const authError = {
                code: 'auth/weak-password',
                message: 'The password is too weak.',
            }

            errorHandler.handleAuthError(authError)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'Password should be at least 6 characters long.',
                details: 'auth/weak-password',
            })
        })

        it('should handle network errors', () => {
            const networkError = {
                code: 'auth/network-request-failed',
                message: 'A network error has occurred.',
            }

            errorHandler.handleAuthError(networkError)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'Network error. Please check your connection.',
                details: 'auth/network-request-failed',
            })
        })

        it('should handle unknown auth errors with fallback message', () => {
            const unknownError = {
                code: 'auth/unknown-error',
                message: 'An unknown error occurred.',
            }

            errorHandler.handleAuthError(unknownError)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'An unknown error occurred.',
                details: 'auth/unknown-error',
            })
        })

        it('should handle errors without code property', () => {
            const errorWithoutCode = {
                message: 'Something went wrong',
            }

            errorHandler.handleAuthError(errorWithoutCode)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'auth',
                message: 'Something went wrong',
            })
        })
    })

    describe('handleApiError', () => {
        it('should handle 429 status code', () => {
            const apiError = { status: 429 }

            const errorId = errorHandler.handleApiError(apiError, 'fetch data')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'api',
                message: 'Too many requests. Please wait a moment and try again.',
                details: 'fetch data - 429',
            })
        })

        it('should handle 500+ status codes', () => {
            const apiError = { status: 500 }

            errorHandler.handleApiError(apiError, 'save data')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'api',
                message: 'Server error. Our team has been notified.',
                details: 'save data - 500',
            })
        })

        it('should handle network errors', () => {
            // Mock navigator.onLine to be false
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            })

            const apiError = {}

            errorHandler.handleApiError(apiError, 'load page')

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'api',
                message: 'No internet connection. Please check your network.',
                details: 'load page - Network Error',
            })

            // Restore navigator.onLine
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            })
        })
    })

    describe('handleNetworkError', () => {
        it('should add network error with context', () => {
            const errorId = errorHandler.handleNetworkError('API call failed')

            expect(errorId).toMatch(/^network_\d+_[a-z0-9]+$/)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0]).toMatchObject({
                type: 'network',
                message: 'Network error. Please check your internet connection and try again.',
                details: 'API call failed',
            })
        })
    })

    describe('error ID generation', () => {
        it('should generate unique IDs with type prefix', () => {
            const errorId = errorHandler.addError('auth', 'Test error')

            expect(errorId).toMatch(/^auth_\d+_[a-z0-9]+$/)

            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0].id).toBe(errorId)
        })

        it('should use current timestamp for error creation', () => {
            const beforeTime = Date.now()

            errorHandler.addError('auth', 'Test error')

            const afterTime = Date.now()
            const updaterFunction = mockSetErrors.mock.calls[0][0]
            const result = updaterFunction([])

            expect(result[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
            expect(result[0].timestamp).toBeLessThanOrEqual(afterTime)
        })
    })
})
