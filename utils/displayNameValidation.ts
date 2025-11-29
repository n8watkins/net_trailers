/**
 * Display Name Validation Utilities
 *
 * Lighter validation for display names (what appears in UI)
 * More permissive than username validation - allows spaces, accents, etc.
 * Only filters extreme profanity and keeps character limits
 */

import { PROFILE_CONSTRAINTS } from '@/types/profile'

/**
 * Core profanity list - most offensive words only
 * Display names are more lenient than usernames
 */
const PROFANITY_LIST = [
    // Extreme profanity
    'fuck',
    'shit',
    'bitch',
    'cunt',
    'nigger',
    'faggot',

    // Slurs and hate speech
    'nazi',
    'hitler',
    'kkk',
    'rape',
    'molest',
    'pedo',
    'pedophile',
] as const

/**
 * Profanity variations (leetspeak, common obfuscation)
 */
const PROFANITY_VARIATIONS = [
    'f*ck',
    'fuk',
    'fck',
    'sh*t',
    'sht',
    'b*tch',
    'n*gger',
    'f@ggot',
] as const

/**
 * Check if display name contains inappropriate content
 * More lenient than username validation
 */
export function containsInappropriateContent(displayName: string): {
    isInappropriate: boolean
    reason?: string
} {
    const lower = displayName.toLowerCase().trim()

    // Check core profanity list
    for (const word of PROFANITY_LIST) {
        if (lower.includes(word)) {
            return {
                isInappropriate: true,
                reason: 'Display name contains inappropriate language',
            }
        }
    }

    // Check profanity variations
    for (const word of PROFANITY_VARIATIONS) {
        if (lower.includes(word)) {
            return {
                isInappropriate: true,
                reason: 'Display name contains inappropriate language',
            }
        }
    }

    return { isInappropriate: false }
}

/**
 * Validate display name format
 * More lenient - allows spaces, accents, most special characters
 */
export function validateDisplayNameFormat(displayName: string): {
    isValid: boolean
    error?: string
} {
    const trimmed = displayName.trim()

    // Check if empty
    if (!trimmed || trimmed.length === 0) {
        return {
            isValid: false,
            error: 'Display name is required',
        }
    }

    // Check minimum length
    if (trimmed.length < PROFILE_CONSTRAINTS.MIN_DISPLAY_NAME_LENGTH) {
        return {
            isValid: false,
            error: `Display name must be at least ${PROFILE_CONSTRAINTS.MIN_DISPLAY_NAME_LENGTH} character`,
        }
    }

    // Check maximum length
    if (trimmed.length > PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH) {
        return {
            isValid: false,
            error: `Display name must be ${PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH} characters or less`,
        }
    }

    // Check for excessive whitespace
    if (/\s{3,}/.test(trimmed)) {
        return {
            isValid: false,
            error: 'Display name cannot contain excessive whitespace',
        }
    }

    // Check if only whitespace/special characters (need at least one letter or number)
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
        return {
            isValid: false,
            error: 'Display name must contain at least one letter or number',
        }
    }

    return { isValid: true }
}

/**
 * Main validation function for display names
 * Combines format and content checks
 */
export function validateDisplayName(displayName: string): {
    isValid: boolean
    error?: string
} {
    // Check format
    const formatCheck = validateDisplayNameFormat(displayName)
    if (!formatCheck.isValid) {
        return formatCheck
    }

    // Check inappropriate content
    const contentCheck = containsInappropriateContent(displayName)
    if (contentCheck.isInappropriate) {
        return {
            isValid: false,
            error: contentCheck.reason,
        }
    }

    return { isValid: true }
}

/**
 * Sanitize display name input
 * Removes leading/trailing whitespace and normalizes spacing
 */
export function sanitizeDisplayNameInput(input: string): string {
    return (
        input
            .trim()
            // Normalize multiple spaces to single space
            .replace(/\s+/g, ' ')
            // Remove control characters
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x1F\x7F]/g, '')
    )
}

/**
 * Create a display name from an email address
 * Useful for initial signup
 */
export function createDisplayNameFromEmail(email: string): string {
    // Extract username part before @
    const username = email.split('@')[0]

    // Remove special characters but keep spaces and basic punctuation
    const cleaned = username
        .replace(/[._-]/g, ' ')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()

    // Capitalize first letter of each word
    const capitalized = cleaned
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

    return capitalized || 'User'
}

/**
 * Suggest alternative display names if validation fails
 * Less strict than username suggestions
 */
export function suggestAlternativeDisplayNames(baseDisplayName: string, count = 3): string[] {
    const suggestions: string[] = []
    const sanitized = sanitizeDisplayNameInput(baseDisplayName)

    // If too long, suggest truncated version
    if (sanitized.length > PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH) {
        suggestions.push(sanitized.substring(0, PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH).trim())
    }

    // Add numbered versions
    for (let i = 1; i <= count && suggestions.length < count; i++) {
        suggestions.push(`${sanitized} ${i}`)
    }

    return suggestions.slice(0, count)
}
