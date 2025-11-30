/**
 * Name Normalization Utilities
 *
 * Prevents users from creating similar-looking names by substituting characters
 * (e.g., I->1, O->0, I->l, etc.)
 */

/**
 * Normalizes a name by replacing visually similar characters
 * This helps detect attempts to impersonate other users
 *
 * Substitutions:
 * - 1 (one) -> i
 * - 0 (zero) -> o
 * - l (lowercase L) -> i
 * - I (uppercase i) -> i
 *
 * @param name - The name to normalize
 * @returns Normalized name in lowercase with substitutions
 */
export function normalizeNameForComparison(name: string): string {
    return name
        .toLowerCase()
        .replace(/1/g, 'i') // 1 -> i
        .replace(/0/g, 'o') // 0 -> o
        .replace(/l/g, 'i') // l -> i
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/[_\-'.]/g, '') // Remove separators
}

/**
 * Checks if two names are confusingly similar
 * Returns true if names would be easily confused with each other
 *
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @returns True if names are confusingly similar
 */
export function areNamesConfusinglySimilar(name1: string, name2: string): boolean {
    const normalized1 = normalizeNameForComparison(name1)
    const normalized2 = normalizeNameForComparison(name2)

    return normalized1 === normalized2
}

/**
 * Validates that a name doesn't contain suspicious character substitutions
 *
 * @param name - The name to validate
 * @returns Validation result with error message if invalid
 */
export function validateNoSuspiciousSubstitutions(name: string): {
    isValid: boolean
    error?: string
} {
    // Check for alternating 1/I/l or 0/O patterns (leetspeak indicators)
    // Only flag if there are 3+ consecutive similar chars that could be confusing
    const suspiciousPatterns = [
        /[1iIl]{3,}/, // 3+ consecutive similar chars (1, i, I, l mixed)
        /[0oO]{3,}/, // 3+ consecutive similar chars (0, o, O mixed)
    ]

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(name)) {
            return {
                isValid: false,
                error: 'Name contains suspicious character patterns. Avoid mixing similar-looking characters.',
            }
        }
    }

    // Check for excessive use of numbers that could be letter substitutions
    // Only flag if more than 40% of alphanumeric characters are digits AND there are substitution patterns
    const digitCount = (name.match(/[0-9]/g) || []).length
    const letterCount = (name.match(/[a-zA-Z]/g) || []).length
    const totalAlphanumeric = digitCount + letterCount

    if (totalAlphanumeric > 0 && digitCount / totalAlphanumeric > 0.4) {
        // Check if the numbers are likely substitutions (0, 1)
        const substitutionDigits = (name.match(/[01]/g) || []).length
        if (substitutionDigits >= 2) {
            return {
                isValid: false,
                error: 'Name contains too many numbers. Avoid using numbers to substitute letters.',
            }
        }
    }

    return { isValid: true }
}
