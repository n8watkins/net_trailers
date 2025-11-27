/**
 * Profile Store (Zustand)
 *
 * Manages user profile state with Firestore sync
 * Handles username, avatar, and profile settings
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
    UserProfile,
    UpdateProfileRequest,
    UsernameAvailability,
    ProfileVisibility,
    DEFAULT_PROFILE_VISIBILITY,
    createDefaultProfile,
} from '../types/profile'
import {
    validateUsername,
    generateRandomUsername,
    createUsernameFromName,
} from '../utils/usernameValidation'
import {
    getProfile,
    getProfileByUsername,
    createProfile as createProfileInFirestore,
    updateProfile as updateProfileInFirestore,
    checkUsernameAvailability as checkUsernameAvailabilityInFirestore,
    uploadAvatar as uploadAvatarToStorage,
    deleteAvatar as deleteAvatarFromStorage,
    updateProfileVisibility as updateProfileVisibilityInFirestore,
    getProfileVisibility as getProfileVisibilityFromFirestore,
} from '../utils/firestore/profiles'
import { updateRankingsUsername } from '../utils/firestore/rankings'
import { updateRankingCommentsUsername } from '../utils/firestore/rankingComments'

const GUEST_ID_PREFIX = 'guest_'

const isGuestUserId = (userId?: string | null): boolean =>
    Boolean(userId && userId.startsWith(GUEST_ID_PREFIX))

interface ProfileState {
    // State
    profile: UserProfile | null
    viewedProfile: UserProfile | null // For viewing other users' profiles
    isLoading: boolean
    error: string | null

    // Actions - Profile CRUD
    loadProfile: (userId: string | null) => Promise<void>
    loadUserProfileByUsername: (username: string) => Promise<void>
    createProfile: (
        userId: string,
        email: string,
        googlePhotoUrl?: string,
        displayName?: string
    ) => Promise<UserProfile>
    updateProfile: (userId: string | null, request: UpdateProfileRequest) => Promise<void>
    uploadAvatar: (userId: string | null, file: File) => Promise<string | null>
    deleteAvatar: (userId: string | null) => Promise<void>

    // Actions - Username
    checkUsernameAvailability: (username: string) => Promise<UsernameAvailability>
    updateUsername: (userId: string | null, newUsername: string) => Promise<void>

    // Actions - Visibility
    getVisibility: (userId: string | null) => Promise<ProfileVisibility>
    updateVisibility: (
        userId: string | null,
        updates: Partial<ProfileVisibility>
    ) => Promise<ProfileVisibility | null>

    // Utility
    clearProfile: () => void
    clearViewedProfile: () => void
    clearError: () => void
    setError: (error: string | null) => void
}

export const useProfileStore = create<ProfileState>()(
    devtools(
        (set, get) => ({
            // Initial state
            profile: null,
            viewedProfile: null,
            isLoading: false,
            error: null,

            // Load current user's profile
            loadProfile: async (userId: string | null) => {
                if (!userId) {
                    set({ profile: null, isLoading: false })
                    return
                }

                // Guests don't have profiles
                if (isGuestUserId(userId)) {
                    set({ profile: null, isLoading: false })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const profile = await getProfile(userId)

                    if (!profile) {
                        set({ error: 'Profile not found', isLoading: false })
                        return
                    }

                    set({ profile, isLoading: false })
                } catch (error) {
                    console.error('Error loading profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load profile',
                        isLoading: false,
                    })
                }
            },

            // Load another user's profile by username
            loadUserProfileByUsername: async (username: string) => {
                set({ isLoading: true, error: null })

                try {
                    const profile = await getProfileByUsername(username)

                    if (!profile) {
                        set({ error: 'User not found', isLoading: false })
                        return
                    }

                    // Check if profile is public
                    if (!profile.isPublic) {
                        set({ error: 'This profile is private', isLoading: false })
                        return
                    }

                    set({ viewedProfile: profile, isLoading: false })
                } catch (error) {
                    console.error('Error loading user profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load profile',
                        isLoading: false,
                    })
                }
            },

            // Create profile for new user
            createProfile: async (
                userId: string,
                email: string,
                googlePhotoUrl?: string,
                displayName?: string
            ) => {
                set({ isLoading: true, error: null })

                try {
                    // Try to create username from display name or email first
                    let username: string
                    let attempts = 0
                    const maxAttempts = 10

                    // Start with display name-based username if provided
                    const baseName = displayName || email
                    username = createUsernameFromName(baseName)

                    // Ensure username is available (append numbers if needed)
                    while (attempts < maxAttempts) {
                        const availability = await get().checkUsernameAvailability(username)
                        if (availability.available) break

                        // Try with number suffix
                        const randomNum = Math.floor(Math.random() * 999) + 1
                        const baseUsername = createUsernameFromName(baseName)
                        username = `${baseUsername}${randomNum}`.slice(0, 20)
                        attempts++
                    }

                    // If still not available, fall back to random username
                    if (attempts >= maxAttempts) {
                        username = generateRandomUsername()
                        const availability = await get().checkUsernameAvailability(username)
                        if (!availability.available) {
                            throw new Error('Could not generate unique username. Please try again.')
                        }
                    }

                    // Create default profile
                    const profile = createDefaultProfile(userId, email, username, googlePhotoUrl)

                    // Save to Firestore
                    await createProfileInFirestore(profile)

                    set({ profile, isLoading: false })
                    return profile
                } catch (error) {
                    console.error('Error creating profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create profile',
                        isLoading: false,
                    })
                    throw error
                }
            },

            // Update profile
            updateProfile: async (userId: string | null, request: UpdateProfileRequest) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    // If updating username, validate it
                    if (request.username) {
                        const validation = validateUsername(request.username)
                        if (!validation.isValid) {
                            set({ error: validation.error || 'Invalid username', isLoading: false })
                            return
                        }

                        // Check availability
                        const availability = await get().checkUsernameAvailability(request.username)
                        if (!availability.available) {
                            set({
                                error: 'Username is already taken',
                                isLoading: false,
                            })
                            return
                        }
                    }

                    await updateProfileInFirestore(userId, request)

                    // Update local state (exclude visibility from spread to avoid type issues)
                    const { visibility: _visibility, ...restRequest } = request
                    set((state) => {
                        if (!state.profile) {
                            return { isLoading: false }
                        }
                        return {
                            profile: {
                                ...state.profile,
                                ...restRequest,
                                updatedAt: Date.now(),
                            },
                            isLoading: false,
                        }
                    })
                } catch (error) {
                    console.error('Error updating profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update profile',
                        isLoading: false,
                    })
                }
            },

            // Upload custom avatar
            uploadAvatar: async (userId: string | null, file: File) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return null
                }

                set({ isLoading: true, error: null })

                try {
                    // Upload to Firebase Storage (updates profile in Firestore too)
                    const avatarUrl = await uploadAvatarToStorage(userId, file)

                    set((state) => ({
                        profile: state.profile
                            ? {
                                  ...state.profile,
                                  avatarUrl,
                                  avatarSource: 'custom',
                                  customAvatarUrl: avatarUrl,
                              }
                            : null,
                        isLoading: false,
                    }))

                    return avatarUrl
                } catch (error) {
                    console.error('Error uploading avatar:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to upload avatar',
                        isLoading: false,
                    })
                    return null
                }
            },

            // Delete custom avatar (revert to Google or generated)
            deleteAvatar: async (userId: string | null) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const profile = get().profile
                    if (!profile) {
                        set({ error: 'Profile not found', isLoading: false })
                        return
                    }

                    // Determine fallback avatar
                    const fallbackAvatarUrl =
                        profile.googlePhotoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
                    const fallbackSource: 'google' | 'generated' = profile.googlePhotoUrl
                        ? 'google'
                        : 'generated'

                    // Delete from Firebase Storage if custom avatar exists
                    if (profile.customAvatarUrl) {
                        await deleteAvatarFromStorage(userId, profile.customAvatarUrl)
                    }

                    // Update profile
                    await get().updateProfile(userId, {
                        avatarSource: fallbackSource,
                    })

                    set((state) => ({
                        profile: state.profile
                            ? {
                                  ...state.profile,
                                  avatarUrl: fallbackAvatarUrl,
                                  avatarSource: fallbackSource,
                                  customAvatarUrl: undefined,
                              }
                            : null,
                        isLoading: false,
                    }))
                } catch (error) {
                    console.error('Error deleting avatar:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to delete avatar',
                        isLoading: false,
                    })
                }
            },

            // Check if username is available
            checkUsernameAvailability: async (username: string): Promise<UsernameAvailability> => {
                // Check Firestore with current user ID to allow keeping current username
                const currentUserId = get().profile?.userId
                return await checkUsernameAvailabilityInFirestore(username, currentUserId)
            },

            // Update username (with all necessary cascading updates)
            updateUsername: async (userId: string | null, newUsername: string) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return
                }

                const trimmedUsername = newUsername.trim()
                const currentProfile = get().profile

                if (!currentProfile) {
                    set({ error: 'Profile not loaded', isLoading: false })
                    return
                }

                if (currentProfile.username === trimmedUsername) {
                    // Nothing to do
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    // Validate and check availability
                    const availability = await get().checkUsernameAvailability(trimmedUsername)
                    if (!availability.available) {
                        set({
                            error: availability.error || 'Username not available',
                            isLoading: false,
                        })
                        return
                    }

                    // Update canonical profile (handles username mapping atomically)
                    await updateProfileInFirestore(userId, { username: trimmedUsername })

                    // Update denormalized references
                    await Promise.all([
                        updateRankingsUsername(userId, trimmedUsername),
                        updateRankingCommentsUsername(userId, trimmedUsername),
                    ])

                    // Update local state
                    set((state) => ({
                        profile: state.profile
                            ? {
                                  ...state.profile,
                                  username: trimmedUsername,
                                  updatedAt: Date.now(),
                              }
                            : null,
                        isLoading: false,
                    }))
                } catch (error) {
                    console.error('Error updating username:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update username',
                        isLoading: false,
                    })
                }
            },

            // Get visibility settings
            getVisibility: async (userId: string | null): Promise<ProfileVisibility> => {
                if (!userId || isGuestUserId(userId)) {
                    return { ...DEFAULT_PROFILE_VISIBILITY }
                }

                try {
                    return await getProfileVisibilityFromFirestore(userId)
                } catch (error) {
                    console.error('Error getting visibility settings:', error)
                    return { ...DEFAULT_PROFILE_VISIBILITY }
                }
            },

            // Update visibility settings
            updateVisibility: async (
                userId: string | null,
                updates: Partial<ProfileVisibility>
            ): Promise<ProfileVisibility | null> => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return null
                }

                set({ isLoading: true, error: null })

                try {
                    const newVisibility = await updateProfileVisibilityInFirestore(userId, updates)

                    // Update local state with full ProfileVisibility object
                    set((state) => {
                        if (!state.profile) {
                            return { isLoading: false }
                        }
                        return {
                            profile: {
                                ...state.profile,
                                visibility: newVisibility,
                                updatedAt: Date.now(),
                            },
                            isLoading: false,
                        }
                    })

                    return newVisibility
                } catch (error) {
                    console.error('Error updating visibility:', error)
                    set({
                        error:
                            error instanceof Error ? error.message : 'Failed to update visibility',
                        isLoading: false,
                    })
                    return null
                }
            },

            // Clear current user's profile
            clearProfile: () => {
                set({ profile: null })
            },

            // Clear viewed profile
            clearViewedProfile: () => {
                set({ viewedProfile: null })
            },

            // Clear error
            clearError: () => {
                set({ error: null })
            },

            // Set error
            setError: (error) => {
                set({ error })
            },
        }),
        { name: 'ProfileStore' }
    )
)
