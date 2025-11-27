'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import { useProfileStore } from '../../../stores/profileStore'
import { useSessionStore } from '../../../stores/sessionStore'
import ProfileSection from '../../../components/settings/ProfileSection'
import { ProfileVisibility, DEFAULT_PROFILE_VISIBILITY } from '../../../types/profile'
import { validateUsername } from '../../../utils/usernameValidation'

const ProfilePage: React.FC = () => {
    const router = useRouter()
    const { user } = useAuth()
    const { isGuest } = useAuthStatus()
    const { showSuccess, showError } = useToast()

    // Profile store for visibility and username
    const {
        profile,
        getVisibility,
        updateVisibility,
        createProfile,
        updateUsername: updateUsernameInStore,
        checkUsernameAvailability,
        isLoading: profileLoading,
    } = useProfileStore()
    const isInitialized = useSessionStore((state) => state.isInitialized)

    // Get userId from user object
    const userId = user?.uid ?? null

    // Profile form state
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // Username state
    const [username, setUsername] = useState(profile?.username || '')
    const [usernameError, setUsernameError] = useState<string | undefined>()
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | undefined>()
    const [isCheckingUsername, setIsCheckingUsername] = useState(false)
    const [isSavingUsername, setIsSavingUsername] = useState(false)
    const usernameDebounceRef = useRef<NodeJS.Timeout | null>(null)

    // Visibility state
    const [visibility, setVisibility] = useState<ProfileVisibility>({
        ...DEFAULT_PROFILE_VISIBILITY,
    })
    const [isLoadingVisibility, setIsLoadingVisibility] = useState(true)
    const [isSavingVisibility, setIsSavingVisibility] = useState(false)

    // Load visibility settings
    useEffect(() => {
        const loadVisibility = async () => {
            if (!isInitialized || isGuest || !userId) {
                setIsLoadingVisibility(false)
                return
            }

            setIsLoadingVisibility(true)
            try {
                const currentVisibility = await getVisibility(userId)
                setVisibility(currentVisibility)
            } catch (error) {
                console.error('Error loading visibility settings:', error)
                setVisibility({ ...DEFAULT_PROFILE_VISIBILITY })
            } finally {
                setIsLoadingVisibility(false)
            }
        }

        loadVisibility()
    }, [isInitialized, isGuest, userId, getVisibility])

    // Sync visibility from profile store
    useEffect(() => {
        if (profile?.visibility) {
            setVisibility(profile.visibility)
        }
    }, [profile?.visibility])

    // Sync username from profile store
    useEffect(() => {
        if (profile?.username) {
            setUsername(profile.username)
            setUsernameAvailable(true) // Current username is always valid
            setUsernameError(undefined)
        }
    }, [profile?.username])

    // Validate and check username availability with debounce
    const handleUsernameChange = useCallback(
        (newUsername: string) => {
            setUsername(newUsername)
            setUsernameAvailable(undefined)
            setUsernameError(undefined)

            // Clear previous debounce
            if (usernameDebounceRef.current) {
                clearTimeout(usernameDebounceRef.current)
            }

            // If same as current username, mark as available
            if (newUsername === profile?.username) {
                setUsernameAvailable(true)
                return
            }

            // If empty, don't validate
            if (!newUsername.trim()) {
                setUsernameError('Username is required')
                return
            }

            // Validate format first
            const validation = validateUsername(newUsername)
            if (!validation.isValid) {
                setUsernameError(validation.error)
                return
            }

            // Check availability with debounce
            setIsCheckingUsername(true)
            usernameDebounceRef.current = setTimeout(async () => {
                try {
                    const availability = await checkUsernameAvailability(newUsername)
                    setUsernameAvailable(availability.available)
                    if (!availability.available) {
                        setUsernameError(availability.error || 'Username is not available')
                    }
                } catch (error) {
                    setUsernameError('Failed to check availability')
                } finally {
                    setIsCheckingUsername(false)
                }
            }, 500)
        },
        [profile?.username, checkUsernameAvailability]
    )

    // Handle username save
    const handleSaveUsername = async () => {
        if (isSavingUsername || !userId || !usernameAvailable || usernameError) return
        if (username === profile?.username) {
            showError('No changes to save')
            return
        }

        setIsSavingUsername(true)
        try {
            await updateUsernameInStore(userId, username)
            showSuccess('Username updated successfully!')
        } catch (error: any) {
            console.error('Error updating username:', error)
            showError(error?.message || 'Failed to update username')
        } finally {
            setIsSavingUsername(false)
        }
    }

    // Handle visibility toggle
    const handleVisibilityChange = useCallback(
        async (id: keyof ProfileVisibility, checked: boolean) => {
            if (isGuest || !userId || !user) {
                showError('Please create an account to change privacy settings')
                return
            }

            const previousVisibility = { ...visibility }

            // If toggling the master switch, update all sub-toggles too
            let updates: Partial<ProfileVisibility>
            let newLocalVisibility: ProfileVisibility

            if (id === 'enablePublicProfile') {
                // Master toggle: set all toggles to the same value
                updates = {
                    enablePublicProfile: checked,
                    showLikedContent: checked,
                    showWatchLater: checked,
                    showRankings: checked,
                    showCollections: checked,
                    showThreads: checked,
                    showPollsCreated: checked,
                    showPollsVoted: checked,
                }
                newLocalVisibility = { ...visibility, ...updates }
            } else {
                // Individual toggle
                updates = { [id]: checked }
                newLocalVisibility = { ...visibility, [id]: checked }
            }

            setVisibility(newLocalVisibility)
            setIsSavingVisibility(true)

            try {
                // If profile doesn't exist, create it first
                if (!profile) {
                    await createProfile(
                        userId,
                        user.email || '',
                        user.photoURL || undefined,
                        user.displayName || undefined
                    )
                }

                const result = await updateVisibility(userId, updates)

                if (result) {
                    if (id === 'enablePublicProfile') {
                        showSuccess(checked ? 'Public profile enabled' : 'Public profile disabled')
                    } else {
                        const labelMap: Record<keyof ProfileVisibility, string> = {
                            enablePublicProfile: 'Public Profile',
                            showLikedContent: 'Liked Content',
                            showWatchLater: 'Watch Later',
                            showRankings: 'Rankings',
                            showCollections: 'Collections',
                            showThreads: 'Forum Threads',
                            showPollsCreated: 'Polls Created',
                            showPollsVoted: 'Polls Voted',
                        }

                        showSuccess(
                            checked
                                ? `${labelMap[id]} will now appear on your profile`
                                : `${labelMap[id]} hidden from your profile`
                        )
                    }
                } else {
                    setVisibility(previousVisibility)
                    showError('Failed to update privacy settings')
                }
            } catch (error) {
                console.error('Error updating visibility:', error)
                setVisibility(previousVisibility)
                showError('Failed to update privacy settings')
            } finally {
                setIsSavingVisibility(false)
            }
        },
        [
            isGuest,
            userId,
            user,
            profile,
            visibility,
            createProfile,
            updateVisibility,
            showSuccess,
            showError,
        ]
    )

    // Detect authentication provider
    const authProvider = React.useMemo(() => {
        if (!user || !user.providerData || user.providerData.length === 0) {
            return null
        }
        const provider = user.providerData[0]
        if (provider.providerId === 'google.com') {
            return 'google'
        } else if (provider.providerId === 'password') {
            return 'email'
        }
        return provider.providerId
    }, [user])

    const isGoogleAuth = authProvider === 'google'
    const isEmailAuth = authProvider === 'email'

    // Sync displayName when user changes
    React.useEffect(() => {
        setDisplayName(user?.displayName || '')
    }, [user?.displayName])

    // Redirect guests to preferences
    React.useEffect(() => {
        if (isGuest) {
            router.push('/settings/preferences')
        }
    }, [isGuest, router])

    // Profile form handler
    const handleSaveProfile = async () => {
        if (isSavingProfile) return
        if (!user) {
            showError('No user found')
            return
        }

        // Check if display name changed
        const displayNameChanged = displayName.trim() !== (user.displayName || '')
        if (!displayNameChanged) {
            showError('No changes to save')
            return
        }

        setIsSavingProfile(true)
        try {
            const { auth } = await import('../../../firebase')
            const { updateProfile } = await import('firebase/auth')

            if (!auth.currentUser) {
                throw new Error('No authenticated user found')
            }

            await updateProfile(auth.currentUser, {
                displayName: displayName.trim(),
            })

            showSuccess('Profile updated successfully!')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error updating profile:', error)
            const message = error?.message || 'Failed to update profile. Please try again.'
            showError(message)
        } finally {
            setIsSavingProfile(false)
        }
    }

    if (isGuest) {
        return null // Will redirect
    }

    return (
        <ProfileSection
            user={user}
            isGoogleAuth={isGoogleAuth}
            isEmailAuth={isEmailAuth}
            displayName={displayName}
            setDisplayName={setDisplayName}
            isSavingProfile={isSavingProfile}
            onSaveProfile={handleSaveProfile}
            username={username}
            setUsername={handleUsernameChange}
            usernameError={usernameError}
            usernameAvailable={usernameAvailable}
            isCheckingUsername={isCheckingUsername}
            isSavingUsername={isSavingUsername}
            onSaveUsername={handleSaveUsername}
            visibility={visibility}
            isLoadingVisibility={isLoadingVisibility || !isInitialized}
            isSavingVisibility={isSavingVisibility}
            onVisibilityChange={handleVisibilityChange}
            profileUsername={profile?.username}
            profileUserId={userId ?? undefined}
        />
    )
}

export default ProfilePage
