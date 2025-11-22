/**
 * Input sanitization utilities for user-provided text
 *
 * Used primarily for AI prompt injection prevention and DoS protection
 */

export const INPUT_LIMITS = {
    MIN_LENGTH: 5,
    MAX_LENGTH: 500,
    MAX_QUERY_LENGTH: 200,
} as const

export interface SanitizationResult {
    isValid: boolean
    sanitized: string
    error?: string
}

/**
 * Sanitize user input for AI prompts
 *
 * Removes control characters, normalizes whitespace, and enforces length limits
 *
 * @param input - Raw user input
 * @param minLength - Minimum allowed length (default: 5)
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitization result with validity status
 */
export function sanitizeInput(
    input: unknown,
    minLength: number = INPUT_LIMITS.MIN_LENGTH,
    maxLength: number = INPUT_LIMITS.MAX_LENGTH
): SanitizationResult {
    // Type validation
    if (!input || typeof input !== 'string') {
        return {
            isValid: false,
            sanitized: '',
            error: 'Invalid input: text must be a string',
        }
    }

    const trimmed = input.trim()

    // Length validation (before sanitization)
    if (trimmed.length < minLength) {
        return {
            isValid: false,
            sanitized: trimmed,
            error: `Text too short (minimum ${minLength} characters)`,
        }
    }

    if (trimmed.length > maxLength) {
        return {
            isValid: false,
            sanitized: trimmed,
            error: `Text too long (maximum ${maxLength} characters)`,
        }
    }

    // Sanitize: remove control characters and normalize whitespace
    // Control character regex is intentional for security sanitization
    const controlCharRegex = /[\x00-\x1F\x7F-\x9F]/g // eslint-disable-line no-control-regex
    const sanitized = trimmed
        .replace(controlCharRegex, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

    // Length validation (after sanitization)
    if (sanitized.length < minLength) {
        return {
            isValid: false,
            sanitized,
            error: 'Text contains too many invalid characters',
        }
    }

    return {
        isValid: true,
        sanitized,
    }
}

/**
 * Sanitize a short query string (stricter limits)
 *
 * @param input - Raw query input
 * @returns Sanitization result
 */
export function sanitizeQuery(input: unknown): SanitizationResult {
    return sanitizeInput(input, INPUT_LIMITS.MIN_LENGTH, INPUT_LIMITS.MAX_QUERY_LENGTH)
}

/**
 * Sanitize an array of strings
 *
 * @param inputs - Array of raw inputs
 * @param maxLength - Maximum length per item
 * @returns Array of sanitized strings (invalid items are filtered out)
 */
export function sanitizeArray(inputs: unknown[], maxLength: number = 100): string[] {
    return inputs
        .filter((item): item is string => typeof item === 'string')
        .map((item) => sanitizeInput(item, 1, maxLength))
        .filter((result) => result.isValid)
        .map((result) => result.sanitized)
}
