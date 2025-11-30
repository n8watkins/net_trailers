/**
 * Tests for Name Normalization Utilities
 */

import {
    normalizeNameForComparison,
    areNamesConfusinglySimilar,
    validateNoSuspiciousSubstitutions,
} from '../../utils/nameNormalization'

describe('normalizeNameForComparison', () => {
    it('should normalize similar characters', () => {
        expect(normalizeNameForComparison('John')).toBe('john')
        expect(normalizeNameForComparison('J0hn')).toBe('john') // 0 -> o
        expect(normalizeNameForComparison('J1hn')).toBe('jihn') // 1 -> i
        expect(normalizeNameForComparison('Jlhn')).toBe('jihn') // l -> i
    })

    it('should remove whitespace and separators', () => {
        expect(normalizeNameForComparison('John Doe')).toBe('johndoe')
        expect(normalizeNameForComparison('John_Doe')).toBe('johndoe')
        expect(normalizeNameForComparison('John-Doe')).toBe('johndoe')
        expect(normalizeNameForComparison("John'Doe")).toBe('johndoe')
        expect(normalizeNameForComparison('John.Doe')).toBe('johndoe')
    })

    it('should handle complex substitutions', () => {
        expect(normalizeNameForComparison('Al1ce')).toBe('aiice') // 1 -> i
        expect(normalizeNameForComparison('B0b')).toBe('bob') // 0 -> o
        expect(normalizeNameForComparison('lIlIl')).toBe('iiiii') // l,I -> i
    })
})

describe('areNamesConfusinglySimilar', () => {
    it('should detect identical names', () => {
        expect(areNamesConfusinglySimilar('Alice', 'Alice')).toBe(true)
        expect(areNamesConfusinglySimilar('alice', 'ALICE')).toBe(true)
    })

    it('should detect character substitution attempts', () => {
        // 0 <-> O substitutions
        expect(areNamesConfusinglySimilar('Bob', 'B0b')).toBe(true)
        expect(areNamesConfusinglySimilar('Cool', 'C00l')).toBe(true)

        // 1 <-> I substitutions
        expect(areNamesConfusinglySimilar('Alice', 'Al1ce')).toBe(true)
        expect(areNamesConfusinglySimilar('Jim', 'J1m')).toBe(true)

        // l <-> I substitutions
        expect(areNamesConfusinglySimilar('Bill', 'BiII')).toBe(true) // ll -> II
        expect(areNamesConfusinglySimilar('Liam', 'IIam')).toBe(true) // L -> II
    })

    it('should detect names with different separators', () => {
        expect(areNamesConfusinglySimilar('JohnDoe', 'John Doe')).toBe(true)
        expect(areNamesConfusinglySimilar('JohnDoe', 'John_Doe')).toBe(true)
        expect(areNamesConfusinglySimilar('JohnDoe', 'John-Doe')).toBe(true)
    })

    it('should not flag genuinely different names', () => {
        expect(areNamesConfusinglySimilar('Alice', 'Bob')).toBe(false)
        expect(areNamesConfusinglySimilar('John', 'Jane')).toBe(false)
    })
})

describe('validateNoSuspiciousSubstitutions', () => {
    it('should allow normal names', () => {
        expect(validateNoSuspiciousSubstitutions('Alice').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('John Doe').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('User123').isValid).toBe(true)
    })

    it('should reject names with excessive substitution numbers', () => {
        // More than 40% numbers with 0s and 1s
        const result = validateNoSuspiciousSubstitutions('Us01')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('too many numbers')
    })

    it('should reject leetspeak patterns', () => {
        // 3+ consecutive similar chars
        const result1 = validateNoSuspiciousSubstitutions('lIlIl')
        expect(result1.isValid).toBe(false)
        expect(result1.error).toContain('suspicious character patterns')

        const result2 = validateNoSuspiciousSubstitutions('O00')
        expect(result2.isValid).toBe(false)
        expect(result2.error).toContain('suspicious character patterns')

        const result3 = validateNoSuspiciousSubstitutions('III')
        expect(result3.isValid).toBe(false)
        expect(result3.error).toContain('suspicious character patterns')
    })

    it('should allow reasonable use of numbers', () => {
        // Less than 40% numbers or no substitution patterns
        expect(validateNoSuspiciousSubstitutions('User1').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('Alice2').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('User789').isValid).toBe(true) // Non-substitution digits
    })

    it('should allow edge cases', () => {
        expect(validateNoSuspiciousSubstitutions('A1').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('AB').isValid).toBe(true)
        expect(validateNoSuspiciousSubstitutions('AB12CD').isValid).toBe(true)
    })
})
