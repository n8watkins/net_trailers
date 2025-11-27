/**
 * Username Validation and Content Moderation
 * Blocks inappropriate usernames and enforces community standards
 */

/**
 * Comprehensive list of inappropriate words/patterns to block
 * Organized by category for maintainability
 */
const INAPPROPRIATE_PATTERNS = {
    // Profanity (common variations)
    profanity: [
        'fuck',
        'shit',
        'ass',
        'bitch',
        'damn',
        'hell',
        'crap',
        'dick',
        'cock',
        'piss',
        'bastard',
        'slut',
        'whore',
        'fag',
        'nigger',
        'nigga',
        'cunt',
        'retard',
        // Common leetspeak/obfuscation
        'f*ck',
        'sh*t',
        'b*tch',
        'a$$',
        'fuk',
        'sht',
        'azz',
        'fck',
        'shyt',
        'phuck',
        'phuk',
        'fuq',
        'fuc',
        'fuk',
        // Unicode lookalikes
        'fuсk', // Cyrillic 'с'
        'shiт', // Cyrillic 'т'
    ],

    // Slurs and hate speech
    slurs: [
        'nazi',
        'hitler',
        'kkk',
        'racist',
        'rape',
        'molest',
        'pedo',
        'pedophile',
        'terrorist',
        'jihad',
    ],

    // Sexual content
    sexual: [
        'porn',
        'sex',
        'xxx',
        'nude',
        'naked',
        'boob',
        'tit',
        'penis',
        'vagina',
        'pussy',
        'horny',
        'milf',
        'dildo',
        'anal',
        'orgasm',
        'cum',
    ],

    // Drug references
    drugs: ['weed', 'cocaine', 'heroin', 'meth', 'drug', 'dealer', 'dealer', 'crack'],

    // Spam/scam patterns
    spam: ['admin', 'mod', 'official', 'support', 'nettrailers', 'staff', 'help', 'service'],

    // Impersonation attempts
    impersonation: ['elon', 'trump', 'biden', 'celebrity', 'famous', 'verified', 'real'],
}

/**
 * Reserved usernames that cannot be used
 */
const RESERVED_USERNAMES = [
    'admin',
    'administrator',
    'mod',
    'moderator',
    'nettrailers',
    'root',
    'system',
    'support',
    'help',
    'staff',
    'official',
    'team',
    'service',
    'bot',
    'api',
    'user',
    'guest',
    'test',
    'demo',
    'null',
    'undefined',
    'true',
    'false',
]

/**
 * Patterns that usernames cannot match
 */
const BANNED_PATTERNS = [
    // Excessive special characters
    /^[_]{3,}/, // Starts with 3+ underscores
    /[_]{3,}$/, // Ends with 3+ underscores
    /[_]{2,}/, // Contains 2+ consecutive underscores

    // Suspicious patterns
    /^admin/i,
    /^mod/i,
    /^nettrailers/i,
    /official$/i,
    /support$/i,
    /\d{8,}/, // 8+ consecutive digits (looks like spam)

    // Only numbers (looks suspicious)
    /^\d+$/,
]

/**
 * Check for Zalgo text / combining characters (Unicode abuse)
 */
function containsZalgoText(text: string): boolean {
    // Check for combining diacritical marks
    const combiningMarks = /[\u0300-\u036f]/g
    const matches = text.match(combiningMarks)
    // If more than 2 combining marks, likely Zalgo text
    return matches !== null && matches.length > 2
}

/**
 * Check if username contains inappropriate content
 */
export function containsInappropriateContent(username: string): {
    isInappropriate: boolean
    reason?: string
    category?: string
} {
    const lowerUsername = username.toLowerCase()

    // Check all inappropriate pattern categories
    for (const [category, words] of Object.entries(INAPPROPRIATE_PATTERNS)) {
        for (const word of words) {
            if (lowerUsername.includes(word.toLowerCase())) {
                return {
                    isInappropriate: true,
                    reason: `Username contains inappropriate content`,
                    category,
                }
            }
        }
    }

    // Check reserved usernames
    if (RESERVED_USERNAMES.includes(lowerUsername)) {
        return {
            isInappropriate: true,
            reason: 'This username is reserved',
            category: 'reserved',
        }
    }

    // Check banned patterns
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(username)) {
            return {
                isInappropriate: true,
                reason: 'Username contains invalid pattern',
                category: 'pattern',
            }
        }
    }

    // Check for Zalgo text
    if (containsZalgoText(username)) {
        return {
            isInappropriate: true,
            reason: 'Username contains invalid characters',
            category: 'pattern',
        }
    }

    return { isInappropriate: false }
}

/**
 * Validate username format
 */
export function validateUsernameFormat(username: string): {
    isValid: boolean
    error?: string
} {
    // Length check
    if (username.length < 3) {
        return { isValid: false, error: 'Username must be at least 3 characters' }
    }

    if (username.length > 20) {
        return { isValid: false, error: 'Username must be 20 characters or less' }
    }

    // Character check (alphanumeric + underscore only)
    const validPattern = /^[a-zA-Z0-9_]+$/
    if (!validPattern.test(username)) {
        return {
            isValid: false,
            error: 'Username can only contain letters, numbers, and underscores',
        }
    }

    // Must start with letter or number (not underscore)
    if (/^_/.test(username)) {
        return { isValid: false, error: 'Username must start with a letter or number' }
    }

    // Must end with letter or number (not underscore)
    if (/_$/.test(username)) {
        return { isValid: false, error: 'Username must end with a letter or number' }
    }

    return { isValid: true }
}

/**
 * Comprehensive username validation
 * Checks format, content moderation, and availability
 */
export function validateUsername(username: string): {
    isValid: boolean
    error?: string
    category?: string
} {
    // Format validation
    const formatCheck = validateUsernameFormat(username)
    if (!formatCheck.isValid) {
        return { isValid: false, error: formatCheck.error }
    }

    // Content moderation
    const contentCheck = containsInappropriateContent(username)
    if (contentCheck.isInappropriate) {
        return {
            isValid: false,
            error: contentCheck.reason,
            category: contentCheck.category,
        }
    }

    return { isValid: true }
}

/**
 * Generate random username
 * Creates family-friendly, unique usernames
 */
export function generateRandomUsername(): string {
    const adjectives = [
        'Swift',
        'Bold',
        'Wise',
        'Bright',
        'Cool',
        'Epic',
        'Stellar',
        'Cosmic',
        'Magic',
        'Mystic',
        'Shadow',
        'Silver',
        'Golden',
        'Crystal',
        'Thunder',
        'Storm',
        'Fire',
        'Frost',
        'Ocean',
        'Sky',
        'Star',
        'Moon',
        'Sun',
        'Wild',
        'Free',
        'Brave',
        'True',
        'Pure',
        'Royal',
        'Noble',
    ]

    const nouns = [
        'Hawk',
        'Eagle',
        'Falcon',
        'Phoenix',
        'Dragon',
        'Wolf',
        'Tiger',
        'Lion',
        'Bear',
        'Fox',
        'Raven',
        'Owl',
        'Shark',
        'Dolphin',
        'Panther',
        'Jaguar',
        'Viper',
        'Cobra',
        'Ninja',
        'Warrior',
        'Knight',
        'Hunter',
        'Ranger',
        'Scout',
        'Pilot',
        'Rider',
        'Voyager',
        'Explorer',
        'Seeker',
        'Dreamer',
    ]

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNumber = Math.floor(Math.random() * 999) + 1

    return `${randomAdjective}${randomNoun}${randomNumber}`
}

/**
 * Suggest alternative usernames if the desired one is taken
 */
export function suggestAlternativeUsernames(baseUsername: string, count: number = 3): string[] {
    const suggestions: string[] = []

    // Remove any numbers from end
    const baseName = baseUsername.replace(/\d+$/, '')

    // Generate variations
    for (let i = 0; i < count; i++) {
        const randomNum = Math.floor(Math.random() * 9999) + 1
        suggestions.push(`${baseName}${randomNum}`)
    }

    // Add some creative variations
    const suffixes = ['_official', '_real', '_the', '_prime']
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    suggestions.push(`${baseName}${randomSuffix}`)

    return suggestions.filter((s) => validateUsername(s).isValid)
}

/**
 * Sanitize username input (remove invalid characters)
 */
export function sanitizeUsernameInput(input: string): string {
    return (
        input
            // Remove non-alphanumeric (except underscore)
            .replace(/[^a-zA-Z0-9_]/g, '')
            // Collapse multiple underscores
            .replace(/_{2,}/g, '_')
            // Remove leading/trailing underscores
            .replace(/^_+|_+$/g, '')
            // Truncate to max length
            .slice(0, 20)
    )
}

/**
 * Create a username from a display name or email
 * Converts "John Doe" -> "john_doe" or "john.doe@email.com" -> "john_doe"
 */
export function createUsernameFromName(name: string): string {
    // Get the base name (handle email)
    let baseName = name.includes('@') ? name.split('@')[0] : name

    // Convert to lowercase, replace spaces and dots with underscores
    baseName = baseName.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '_')

    // Sanitize to remove any invalid characters
    const sanitized = sanitizeUsernameInput(baseName)

    // Ensure minimum length
    if (sanitized.length < 3) {
        // If too short, generate a random username instead
        return generateRandomUsername()
    }

    return sanitized
}

/**
 * Check if username is available in Firestore
 * (This will be implemented in the profile service)
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
    // This will be implemented with Firestore query
    // For now, just validate format and content
    const validation = validateUsername(username)
    return validation.isValid
}
