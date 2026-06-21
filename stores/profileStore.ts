/**
 * Profile Store (Zustand)
 *
 * Manages user profile state and syncs with the Drizzle-backed API routes.
 * All writes go through /api/profiles/[userId] (PATCH) or
 * /api/profiles/username-availability (GET) so the server always derives the
 * acting user from the Auth.js session — the userId parameter in URLs is used
 * for routing only; the server re-validates ownership.
 *
 * Avatar upload: Firebase Storage has been removed. The `uploadAvatar` action
 * now accepts a data URL or any externally hosted URL and writes it directly
 * to the `avatarUrl` column via the profile PATCH endpoint. Large file upload
 * support (e.g., S3, Cloudinary) can be layered in later without changing the
 * store's public API.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import {
    DEFAULT_PROFILE_VISIBILITY,
    createDefaultProfile,
    type ProfileVisibility,
    type UpdateProfileRequest,
    type UserProfile,
    type UsernameAvailability,
} from '@/types/profile'
import { validateDisplayName, createDisplayNameFromEmail } from '@/utils/displayNameValidation'

const GUEST_ID_PREFIX = 'guest_'

const isGuestUserId = (userId?: string | null): boolean =>
    Boolean(userId && userId.startsWith(GUEST_ID_PREFIX))

interface ProfileState {
    // State
    profile: UserProfile | null
    viewedProfile: UserProfile | null
    isLoading: boolean
    error: string | null

    // Actions — Profile CRUD
    loadProfile: (userId: string | null) => Promise<void>
    loadUserProfileByUsername: (username: string) => Promise<void>
    createProfile: (
        userId: string,
        email: string,
        googlePhotoUrl?: string,
        displayName?: string
    ) => Promise<UserProfile>
    updateProfile: (userId: string | null, request: UpdateProfileRequest) => Promise<void>
    uploadAvatar: (userId: string | null, dataUrlOrUrl: string) => Promise<string | null>
    deleteAvatar: (userId: string | null) => Promise<void>

    // Actions — Username
    checkUsernameAvailability: (username: string) => Promise<UsernameAvailability>
    updateUsername: (userId: string | null, newUsername: string) => Promise<void>

    // Actions — Visibility
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
            // ── Initial state ────────────────────────────────────────────────
            profile: null,
            viewedProfile: null,
            isLoading: false,
            error: null,

            // ── Load current user's profile ──────────────────────────────────
            loadProfile: async (userId: string | null) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ profile: null, isLoading: false })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const res = await fetch(`/api/profiles/${userId}`)
                    if (res.status === 404) {
                        set({ error: 'Profile not found', isLoading: false })
                        return
                    }
                    if (!res.ok) {
                        throw new Error(`Failed to load profile (${res.status})`)
                    }
                    const data = await res.json()
                    set({ profile: data.profile as UserProfile, isLoading: false })
                } catch (error) {
                    console.error('Error loading profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load profile',
                        isLoading: false,
                    })
                }
            },

            // ── Load another user's profile by username ──────────────────────
            loadUserProfileByUsername: async (username: string) => {
                set({ isLoading: true, error: null })

                try {
                    // The /api/public-profile/username/[username] route already
                    // handles username → userId resolution and visibility checks.
                    const res = await fetch(
                        `/api/public-profile/username/${encodeURIComponent(username)}`
                    )
                    if (res.status === 404) {
                        set({ error: 'User not found', isLoading: false })
                        return
                    }
                    if (!res.ok) {
                        throw new Error(`Failed to load profile (${res.status})`)
                    }
                    const payload = await res.json()
                    // Map the lean public payload to the UserProfile shape the store expects.
                    const synthetic: Partial<UserProfile> = {
                        displayName: payload.profile?.displayName ?? 'User',
                        avatarUrl: payload.profile?.avatarUrl ?? undefined,
                        description: payload.profile?.bio ?? undefined,
                        favoriteGenres: payload.profile?.favoriteGenres ?? [],
                        visibility: payload.visibility,
                    }
                    set({ viewedProfile: synthetic as UserProfile, isLoading: false })
                } catch (error) {
                    console.error('Error loading user profile:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load profile',
                        isLoading: false,
                    })
                }
            },

            // ── Create profile for new user ──────────────────────────────────
            createProfile: async (
                userId: string,
                email: string,
                googlePhotoUrl?: string,
                displayName?: string
            ) => {
                set({ isLoading: true, error: null })

                try {
                    // Check if profile already exists.
                    const checkRes = await fetch(`/api/profiles/${userId}`)
                    if (checkRes.ok) {
                        const existing = await checkRes.json()
                        if (existing.profile) {
                            set({ profile: existing.profile as UserProfile, isLoading: false })
                            return existing.profile as UserProfile
                        }
                    }

                    const finalDisplayName = displayName || createDisplayNameFromEmail(email)

                    const nameValidation = validateDisplayName(finalDisplayName)
                    if (!nameValidation.isValid) {
                        throw new Error(nameValidation.error || 'Invalid display name')
                    }

                    // Build the default profile locally so we can send it as the
                    // initial PATCH payload.
                    const defaultProfile = createDefaultProfile(
                        userId,
                        email,
                        finalDisplayName,
                        googlePhotoUrl
                    )

                    // PATCH upserts — the server will insert if the row is absent.
                    const patchPayload: UpdateProfileRequest = {
                        displayName: defaultProfile.displayName,
                        description: defaultProfile.description,
                        favoriteGenres: defaultProfile.favoriteGenres,
                        isPublic: defaultProfile.isPublic,
                        visibility: defaultProfile.visibility,
                        avatarSource: defaultProfile.avatarSource,
                    }

                    const patchRes = await authenticatedFetch(`/api/profiles/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(patchPayload),
                    })

                    if (!patchRes.ok) {
                        const body = await patchRes.json().catch(() => null)
                        throw new Error(
                            body?.error || `Failed to create profile (${patchRes.status})`
                        )
                    }

                    const created = await patchRes.json()
                    const profile = (created.profile as UserProfile) ?? defaultProfile
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

            // ── Update profile ───────────────────────────────────────────────
            updateProfile: async (userId: string | null, request: UpdateProfileRequest) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const res = await authenticatedFetch(`/api/profiles/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(request),
                    })

                    if (!res.ok) {
                        const body = await res.json().catch(() => null)
                        throw new Error(body?.error || `Failed to update profile (${res.status})`)
                    }

                    const data = await res.json()
                    const updated = data.profile as UserProfile | undefined

                    // Update local state. Visibility is handled by the server;
                    // merge whatever the server returns.
                    set((state) => {
                        if (!state.profile) return { isLoading: false }
                        return {
                            profile:
                                updated ??
                                ({
                                    ...state.profile,
                                    ...request,
                                    updatedAt: Date.now(),
                                } as UserProfile),
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

            // ── Avatar upload (data URL or external URL) ─────────────────────
            //
            // Firebase Storage is no longer used. Callers should convert the
            // File to a data URL (or upload to their own CDN and pass the URL)
            // before calling this method. The URL is written directly to the
            // profiles.avatarUrl column via /api/profiles/[userId]/avatar.
            uploadAvatar: async (userId: string | null, dataUrlOrUrl: string) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return null
                }

                set({ isLoading: true, error: null })

                try {
                    const res = await authenticatedFetch(`/api/profiles/${userId}/avatar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avatarUrl: dataUrlOrUrl, avatarSource: 'custom' }),
                    })

                    if (!res.ok) {
                        const body = await res.json().catch(() => null)
                        throw new Error(body?.error || `Failed to update avatar (${res.status})`)
                    }

                    set((state) => ({
                        profile: state.profile
                            ? {
                                  ...state.profile,
                                  avatarUrl: dataUrlOrUrl,
                                  avatarSource: 'custom',
                              }
                            : null,
                        isLoading: false,
                    }))

                    return dataUrlOrUrl
                } catch (error) {
                    console.error('Error uploading avatar:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to upload avatar',
                        isLoading: false,
                    })
                    return null
                }
            },

            // ── Delete custom avatar (revert to Google / generated) ──────────
            deleteAvatar: async (userId: string | null) => {
                if (!userId || isGuestUserId(userId)) {
                    set({ error: 'Authentication required' })
                    return
                }

                const profile = get().profile
                if (!profile) {
                    set({ error: 'Profile not loaded' })
                    return
                }

                set({ isLoading: true, error: null })

                const fallbackAvatarUrl =
                    profile.googlePhotoUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`
                const fallbackSource: 'google' | 'generated' = profile.googlePhotoUrl
                    ? 'google'
                    : 'generated'

                try {
                    await get().updateProfile(userId, { avatarSource: fallbackSource })

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

            // ── Username availability ────────────────────────────────────────
            checkUsernameAvailability: async (username: string): Promise<UsernameAvailability> => {
                const currentUserId = get().profile?.userId
                const params = new URLSearchParams({ username })
                if (currentUserId) params.set('currentUserId', currentUserId)

                try {
                    const res = await fetch(
                        `/api/profiles/username-availability?${params.toString()}`
                    )
                    if (!res.ok) {
                        return { available: false, error: 'Could not verify username' }
                    }
                    return (await res.json()) as UsernameAvailability
                } catch {
                    return { available: false, error: 'Could not verify username availability' }
                }
            },

            // ── Update username ──────────────────────────────────────────────
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

                if (currentProfile.username === trimmedUsername) return

                set({ isLoading: true, error: null })

                try {
                    const availability = await get().checkUsernameAvailability(trimmedUsername)
                    if (!availability.available) {
                        set({
                            error: availability.error || 'Username not available',
                            isLoading: false,
                        })
                        return
                    }

                    await get().updateProfile(userId, { username: trimmedUsername })

                    set((state) => ({
                        profile: state.profile
                            ? { ...state.profile, username: trimmedUsername, updatedAt: Date.now() }
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

            // ── Visibility ───────────────────────────────────────────────────
            getVisibility: async (userId: string | null): Promise<ProfileVisibility> => {
                if (!userId || isGuestUserId(userId)) {
                    return { ...DEFAULT_PROFILE_VISIBILITY }
                }

                try {
                    const res = await fetch(`/api/profiles/${userId}`)
                    if (!res.ok) return { ...DEFAULT_PROFILE_VISIBILITY }
                    const data = await res.json()
                    const profile = data.profile as UserProfile | undefined
                    return profile?.visibility
                        ? { ...DEFAULT_PROFILE_VISIBILITY, ...profile.visibility }
                        : { ...DEFAULT_PROFILE_VISIBILITY }
                } catch {
                    return { ...DEFAULT_PROFILE_VISIBILITY }
                }
            },

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
                    const res = await authenticatedFetch(`/api/profiles/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            visibility: updates,
                        } satisfies UpdateProfileRequest),
                    })

                    if (!res.ok) {
                        const body = await res.json().catch(() => null)
                        throw new Error(
                            body?.error || `Failed to update visibility (${res.status})`
                        )
                    }

                    const data = await res.json()
                    const updated = data.profile as UserProfile | undefined

                    const newVisibility: ProfileVisibility = {
                        ...DEFAULT_PROFILE_VISIBILITY,
                        ...(updated?.visibility ?? {}),
                        ...updates,
                    }

                    set((state) => {
                        if (!state.profile) return { isLoading: false }
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

            // ── Utilities ────────────────────────────────────────────────────
            clearProfile: () => set({ profile: null }),
            clearViewedProfile: () => set({ viewedProfile: null }),
            clearError: () => set({ error: null }),
            setError: (error) => set({ error }),
        }),
        { name: 'ProfileStore' }
    )
)
