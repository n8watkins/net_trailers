import { createErrorHandler } from '../../utils/errorHandler'

describe('errorHandler', () => {
  let mockSetErrors: jest.Mock
  let errorHandler: ReturnType<typeof createErrorHandler>

  beforeEach(() => {
    mockSetErrors = jest.fn()
    errorHandler = createErrorHandler(mockSetErrors)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('addError', () => {
    it('should add a new error to the state', () => {
      errorHandler.addError('auth', 'Invalid credentials')

      expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))

      // Test the updater function
      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        type: 'error',
        category: 'auth',
        message: 'Invalid credentials',
        timestamp: expect.any(Date),
      })
    })

    it('should generate unique IDs for multiple errors', () => {
      errorHandler.addError('auth', 'Error 1')
      errorHandler.addError('auth', 'Error 2')

      expect(mockSetErrors).toHaveBeenCalledTimes(2)

      const firstUpdater = mockSetErrors.mock.calls[0][0]
      const secondUpdater = mockSetErrors.mock.calls[1][0]

      const firstResult = firstUpdater([])
      const secondResult = secondUpdater(firstResult)

      expect(secondResult).toHaveLength(2)
      expect(secondResult[0].id).not.toBe(secondResult[1].id)
    })

    it('should limit errors to maximum of 5', () => {
      // Start with 5 existing errors
      const existingErrors = Array.from({ length: 5 }, (_, i) => ({
        id: `error-${i}`,
        type: 'error' as const,
        category: 'test',
        message: `Error ${i}`,
        timestamp: new Date(),
      }))

      errorHandler.addError('auth', 'New error')

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction(existingErrors)

      expect(result).toHaveLength(5)
      expect(result[0].message).toBe('Error 1') // First error removed
      expect(result[4].message).toBe('New error') // New error added at end
    })
  })

  describe('addSuccess', () => {
    it('should add a success message to the state', () => {
      errorHandler.addSuccess('Successfully logged in!')

      expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        type: 'success',
        category: 'general',
        message: 'Successfully logged in!',
        timestamp: expect.any(Date),
      })
    })
  })

  describe('addWarning', () => {
    it('should add a warning message to the state', () => {
      errorHandler.addWarning('Your session will expire soon')

      expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        type: 'warning',
        category: 'general',
        message: 'Your session will expire soon',
        timestamp: expect.any(Date),
      })
    })
  })

  describe('removeError', () => {
    it('should remove an error by ID', () => {
      const existingErrors = [
        {
          id: 'error-1',
          type: 'error' as const,
          category: 'auth',
          message: 'Error 1',
          timestamp: new Date(),
        },
        {
          id: 'error-2',
          type: 'error' as const,
          category: 'auth',
          message: 'Error 2',
          timestamp: new Date(),
        },
      ]

      errorHandler.removeError('error-1')

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction(existingErrors)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('error-2')
    })

    it('should not modify state if error ID not found', () => {
      const existingErrors = [
        {
          id: 'error-1',
          type: 'error' as const,
          category: 'auth',
          message: 'Error 1',
          timestamp: new Date(),
        },
      ]

      errorHandler.removeError('nonexistent-id')

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction(existingErrors)

      expect(result).toEqual(existingErrors)
    })
  })

  describe('clearAll', () => {
    it('should clear all errors', () => {
      errorHandler.clearAll()

      expect(mockSetErrors).toHaveBeenCalledWith([])
    })
  })

  describe('handleAuthError', () => {
    it('should handle auth/invalid-credential error', () => {
      const authError = {
        code: 'auth/invalid-credential',
        message: 'The supplied auth credential is malformed or has expired.',
      }

      errorHandler.handleAuthError(authError)

      expect(mockSetErrors).toHaveBeenCalledWith(expect.any(Function))

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result[0]).toMatchObject({
        type: 'error',
        category: 'auth',
        message: 'Invalid email or password. Please check your credentials and try again.',
      })
    })

    it('should handle auth/user-not-found error', () => {
      const authError = {
        code: 'auth/user-not-found',
        message: 'There is no user record corresponding to this identifier.',
      }

      errorHandler.handleAuthError(authError)

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result[0]).toMatchObject({
        type: 'error',
        category: 'auth',
        message: 'No account found with this email address. Please sign up first.',
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
        type: 'error',
        category: 'auth',
        message: 'An account with this email already exists. Please sign in instead.',
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
        type: 'error',
        category: 'auth',
        message: 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.',
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
        type: 'error',
        category: 'auth',
        message: 'Network error. Please check your internet connection and try again.',
      })
    })

    it('should handle unknown auth errors with generic message', () => {
      const unknownError = {
        code: 'auth/unknown-error',
        message: 'An unknown error occurred.',
      }

      errorHandler.handleAuthError(unknownError)

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result[0]).toMatchObject({
        type: 'error',
        category: 'auth',
        message: 'Authentication failed. Please try again or contact support if the problem persists.',
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
        type: 'error',
        category: 'auth',
        message: 'Authentication failed. Please try again or contact support if the problem persists.',
      })
    })
  })

  describe('error message formatting', () => {
    it('should generate unique IDs using crypto.randomUUID or fallback', () => {
      // Mock crypto.randomUUID to be undefined to test fallback
      const originalCrypto = global.crypto
      delete (global as any).crypto

      errorHandler.addError('test', 'Test error')

      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result[0].id).toMatch(/^[a-f0-9-]+$/) // Should be a valid UUID format

      // Restore crypto
      global.crypto = originalCrypto
    })

    it('should use current timestamp for error creation', () => {
      const beforeTime = new Date()

      errorHandler.addError('test', 'Test error')

      const afterTime = new Date()
      const updaterFunction = mockSetErrors.mock.calls[0][0]
      const result = updaterFunction([])

      expect(result[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(result[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })
})