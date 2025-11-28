/**
 * Avatar source types
 */
export type AvatarSource = 'google' | 'custom' | 'generated'

/**
 * Profile visibility settings
 * Controls which sections are visible on the public profile
 * Profile identity (displayName, avatar, bio, genres) is always visible
 */
export interface ProfileVisibility {
    enablePublicProfile: boolean // Master toggle - when off, all sections hidden
    showLikedContent: boolean // Show liked movies/shows
    showWatchLater: boolean // Show watch later preview
    showRankings: boolean // Show public rankings
    showCollections: boolean // Show shared collections
    showThreads: boolean // Show forum threads created
    showThreadsVoted: boolean // Show forum threads liked/voted on
    showPollsCreated: boolean // Show polls created
    showPollsVoted: boolean // Show polls voted on
}

/**
 * Default visibility settings (all sections visible)
 */
export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = {
    enablePublicProfile: true,
    showLikedContent: true,
    showWatchLater: true,
    showRankings: true,
    showCollections: true,
    showThreads: true,
    showThreadsVoted: true,
    showPollsCreated: true,
    showPollsVoted: true,
}

/**
 * User Profile
 * Public profile information displayed to other users
 */
export interface UserProfile {
    id: string // Same as userId
    userId: string // Firebase auth ID
    email: string // Private (not shown publicly)

    // Identity
    displayName: string // User's display name shown in UI

    // Avatar system
    avatarUrl: string // Current avatar URL
    avatarSource: AvatarSource // Where avatar came from
    googlePhotoUrl?: string // Original Google photo (cached)
    customAvatarUrl?: string // Uploaded custom avatar (if any)

    // About section
    description?: string // "I love psychological thrillers and classic horror"
    favoriteGenres?: string[] // Optional genre tags

    // Auto-calculated stats
    rankingsCount: number
    publicCollectionsCount: number
    totalLikes: number
    totalViews: number

    // Settings
    isPublic: boolean // @deprecated - profile is always visible, use visibility for sections
    visibility?: ProfileVisibility // Controls which sections are visible on public profile

    // Timestamps
    createdAt: number
    updatedAt: number
    lastLoginAt?: number // Track last login for trending notifications
}

/**
 * Request to update profile
 */
export interface UpdateProfileRequest {
    displayName?: string
    description?: string
    favoriteGenres?: string[]
    isPublic?: boolean // @deprecated - use visibility instead
    visibility?: Partial<ProfileVisibility>
    avatarSource?: AvatarSource // Switch between Google/custom/generated
}

/**
 * Request to upload custom avatar
 */
export interface UploadAvatarRequest {
    file: File
    userId: string
}

/**
 * Avatar upload response
 */
export interface UploadAvatarResponse {
    avatarUrl: string
    success: boolean
    error?: string
}

/**
 * Username availability check result
 */
export interface UsernameAvailability {
    available: boolean
    suggestions?: string[] // If taken, suggest alternatives
    error?: string
}

/**
 * Profile validation constraints
 */
export const PROFILE_CONSTRAINTS = {
    // Username
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 20,
    USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,

    // Description
    MAX_DESCRIPTION_LENGTH: 300,

    // Favorite genres
    MAX_FAVORITE_GENRES: 5,

    // Avatar
    MAX_AVATAR_SIZE_MB: 5,
    ALLOWED_AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    AVATAR_DIMENSIONS: {
        MIN: 100, // Minimum 100x100px
        MAX: 2000, // Maximum 2000x2000px
        RECOMMENDED: 400, // Recommended 400x400px
    },
} as const

/**
 * Profile validation errors
 */
export type ProfileValidationError =
    | 'USERNAME_TOO_SHORT'
    | 'USERNAME_TOO_LONG'
    | 'USERNAME_INVALID_CHARS'
    | 'USERNAME_TAKEN'
    | 'USERNAME_INAPPROPRIATE'
    | 'DESCRIPTION_TOO_LONG'
    | 'TOO_MANY_GENRES'
    | 'AVATAR_TOO_LARGE'
    | 'AVATAR_INVALID_TYPE'
    | 'AVATAR_INVALID_DIMENSIONS'
    | 'PROFILE_NOT_FOUND'
    | 'NOT_AUTHORIZED'

/**
 * Helper to validate avatar file
 */
export function validateAvatarFile(file: File): {
    isValid: boolean
    error?: ProfileValidationError
    message?: string
} {
    // Check file size (5MB max)
    const maxSizeBytes = PROFILE_CONSTRAINTS.MAX_AVATAR_SIZE_MB * 1024 * 1024
    if (file.size > maxSizeBytes) {
        return {
            isValid: false,
            error: 'AVATAR_TOO_LARGE',
            message: `Avatar must be less than ${PROFILE_CONSTRAINTS.MAX_AVATAR_SIZE_MB}MB`,
        }
    }

    // Check file type
    if (
        !PROFILE_CONSTRAINTS.ALLOWED_AVATAR_TYPES.includes(
            file.type as (typeof PROFILE_CONSTRAINTS.ALLOWED_AVATAR_TYPES)[number]
        )
    ) {
        return {
            isValid: false,
            error: 'AVATAR_INVALID_TYPE',
            message: 'Avatar must be JPEG, PNG, GIF, or WebP',
        }
    }

    return { isValid: true }
}

/**
 * Helper to validate avatar dimensions
 */
export async function validateAvatarDimensions(file: File): Promise<{
    isValid: boolean
    error?: ProfileValidationError
    message?: string
    dimensions?: { width: number; height: number }
}> {
    return new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            const { width, height } = img
            const { MIN, MAX } = PROFILE_CONSTRAINTS.AVATAR_DIMENSIONS

            // Check minimum dimensions
            if (width < MIN || height < MIN) {
                resolve({
                    isValid: false,
                    error: 'AVATAR_INVALID_DIMENSIONS',
                    message: `Avatar must be at least ${MIN}x${MIN} pixels`,
                    dimensions: { width, height },
                })
                return
            }

            // Check maximum dimensions
            if (width > MAX || height > MAX) {
                resolve({
                    isValid: false,
                    error: 'AVATAR_INVALID_DIMENSIONS',
                    message: `Avatar must be no larger than ${MAX}x${MAX} pixels`,
                    dimensions: { width, height },
                })
                return
            }

            resolve({ isValid: true, dimensions: { width, height } })
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve({
                isValid: false,
                error: 'AVATAR_INVALID_TYPE',
                message: 'Could not load image file',
            })
        }

        img.src = url
    })
}

/**
 * Default profile for new users
 */
export function createDefaultProfile(
    userId: string,
    email: string,
    displayName: string,
    googlePhotoUrl?: string
): UserProfile {
    return {
        id: userId,
        userId,
        email,
        displayName,
        avatarUrl:
            googlePhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
        avatarSource: googlePhotoUrl ? 'google' : 'generated',
        googlePhotoUrl: googlePhotoUrl,
        description: '',
        favoriteGenres: [],
        rankingsCount: 0,
        publicCollectionsCount: 0,
        totalLikes: 0,
        totalViews: 0,
        isPublic: true, // @deprecated - kept for backward compatibility
        visibility: { ...DEFAULT_PROFILE_VISIBILITY },
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
}
