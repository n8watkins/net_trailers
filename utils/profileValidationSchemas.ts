/**
 * Profile Validation Schemas using Zod
 *
 * Provides type-safe validation for display names and usernames
 */

import { z } from 'zod'
import { PROFILE_CONSTRAINTS } from '@/types/profile'
import { containsInappropriateContent as checkDisplayNameInappropriate } from './displayNameValidation'
import { containsInappropriateContent as checkUsernameInappropriate } from './usernameValidation'
import { validateNoSuspiciousSubstitutions } from './nameNormalization'

/**
 * Display Name Schema
 * - Required, 1-50 characters
 * - Must contain at least one letter or number
 * - Cannot contain excessive whitespace
 * - Strict toxic word filtering (80+ words)
 * - No character substitution tricks (1->I, 0->O, l->I)
 * - Only allowed characters: letters, numbers, spaces, hyphens, apostrophes, periods
 */
export const displayNameSchema = z
    .string()
    .min(
        PROFILE_CONSTRAINTS.MIN_DISPLAY_NAME_LENGTH,
        `Display name must be at least ${PROFILE_CONSTRAINTS.MIN_DISPLAY_NAME_LENGTH} character`
    )
    .max(
        PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH,
        `Display name must be ${PROFILE_CONSTRAINTS.MAX_DISPLAY_NAME_LENGTH} characters or less`
    )
    .trim()
    .refine((val) => val.length > 0, {
        message: 'Display name is required',
    })
    .refine((val) => PROFILE_CONSTRAINTS.DISPLAY_NAME_PATTERN.test(val), {
        message:
            'Display name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods',
    })
    .refine((val) => !/\s{3,}/.test(val), {
        message: 'Display name cannot contain excessive whitespace',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
        message: 'Display name must contain at least one letter',
    })
    .refine(
        (val) => {
            const validation = validateNoSuspiciousSubstitutions(val)
            return validation.isValid
        },
        {
            message:
                'Display name contains suspicious character patterns. Avoid mixing numbers with similar-looking letters.',
        }
    )
    .refine(
        (val) => {
            const check = checkDisplayNameInappropriate(val)
            return !check.isInappropriate
        },
        {
            message: 'Display name contains inappropriate content',
        }
    )

/**
 * Username Schema (Optional)
 * - 3-20 characters
 * - Alphanumeric + underscore only
 * - Must start/end with letter or number
 * - Strict toxic word filtering (80+ words)
 * - No character substitution tricks (1->I, 0->O, l->I)
 */
export const usernameSchema = z
    .string()
    .min(
        PROFILE_CONSTRAINTS.MIN_USERNAME_LENGTH,
        `Username must be at least ${PROFILE_CONSTRAINTS.MIN_USERNAME_LENGTH} characters`
    )
    .max(
        PROFILE_CONSTRAINTS.MAX_USERNAME_LENGTH,
        `Username must be ${PROFILE_CONSTRAINTS.MAX_USERNAME_LENGTH} characters or less`
    )
    .regex(
        PROFILE_CONSTRAINTS.USERNAME_PATTERN,
        'Username can only contain letters, numbers, and underscores'
    )
    .regex(/^[a-zA-Z0-9]/, 'Username must start with a letter or number')
    .regex(/[a-zA-Z0-9]$/, 'Username must end with a letter or number')
    .refine(
        (val) => {
            const validation = validateNoSuspiciousSubstitutions(val)
            return validation.isValid
        },
        {
            message:
                'Username contains suspicious character patterns. Avoid mixing numbers with similar-looking letters.',
        }
    )
    .refine(
        (val) => {
            const check = checkUsernameInappropriate(val)
            return !check.isInappropriate
        },
        {
            message: 'Username contains inappropriate content',
        }
    )
    .optional()

/**
 * Profile Update Schema
 */
export const profileUpdateSchema = z.object({
    displayName: displayNameSchema.optional(),
    username: usernameSchema.optional(),
    description: z
        .string()
        .max(
            PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            `Description must be ${PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters or less`
        )
        .optional(),
    favoriteGenres: z
        .array(z.string())
        .max(
            PROFILE_CONSTRAINTS.MAX_FAVORITE_GENRES,
            `You can select up to ${PROFILE_CONSTRAINTS.MAX_FAVORITE_GENRES} favorite genres`
        )
        .optional(),
})

/**
 * Validate display name and return user-friendly error
 */
export function validateDisplayNameWithZod(displayName: string): {
    isValid: boolean
    error?: string
} {
    try {
        displayNameSchema.parse(displayName)
        return { isValid: true }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isValid: false,
                error: error.errors[0]?.message || 'Invalid display name',
            }
        }
        return { isValid: false, error: 'Invalid display name' }
    }
}

/**
 * Validate username and return user-friendly error
 */
export function validateUsernameWithZod(username: string): {
    isValid: boolean
    error?: string
} {
    try {
        usernameSchema.parse(username)
        return { isValid: true }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isValid: false,
                error: error.errors[0]?.message || 'Invalid username',
            }
        }
        return { isValid: false, error: 'Invalid username' }
    }
}
