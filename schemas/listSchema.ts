import { z } from 'zod'

/**
 * Zod schema for list name validation
 * Validates list names to ensure they meet requirements:
 * - Not empty
 * - Between 1 and 50 characters
 * - No leading/trailing whitespace after trim
 */
export const listNameSchema = z
    .string()
    .min(1, 'List name is required')
    .max(50, 'List name must be 50 characters or less')
    .trim()
    .refine((name) => name.length > 0, {
        message: 'List name cannot be only whitespace',
    })

/**
 * Custom validation function to check for duplicate list names
 * This should be used in addition to the schema validation
 */
export const validateListNameUnique = (
    name: string,
    existingNames: string[],
    excludeName?: string
): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim().toLowerCase()

    // Filter out the name being edited (if applicable)
    const namesToCheck = existingNames
        .filter((n) => !excludeName || n.toLowerCase() !== excludeName.toLowerCase())
        .map((n) => n.toLowerCase())

    if (namesToCheck.includes(trimmedName)) {
        return {
            isValid: false,
            error: `A list named "${name.trim()}" already exists. Please choose a different name.`,
        }
    }

    return { isValid: true }
}
