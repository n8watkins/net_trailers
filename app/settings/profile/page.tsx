'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import { useProfileStore } from '../../../stores/profileStore'
import { useSessionStore } from '../../../stores/sessionStore'
import ProfileSection from '../../../components/settings/ProfileSection'
import { ProfileVisibility, DEFAULT_PROFILE_VISIBILITY } from '../../../types/profile'

const ProfilePage: React.FC = () => {
    const router = useRouter()
    const { user } = useAuth()
    const { isGuest } = useAuthStatus()
    const { showSuccess, showError } = useToast()

    // Profile store for visibility
    const { profile, getVisibility, updateVisibility, isLoading: profileLoading } = useProfileStore()
    const isInitialized = useSessionStore((state) => state.isInitialized)

    // Get userId from user object
    const userId = user?.uid ?? null

    // Profile form state
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // Visibility state
    const [visibility, setVisibility] = useState<ProfileVisibility>({ ...DEFAULT_PROFILE_VISIBILITY })
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

    // Handle visibility toggle
    const handleVisibilityChange = useCallback(
        async (id: keyof ProfileVisibility, checked: boolean) => {
            if (isGuest || !userId) {
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
                const result = await updateVisibility(userId, updates)

                if (result) {
                    if (id === 'enablePublicProfile') {
                        showSuccess(
                            checked
                                ? 'Public profile enabled'
                                : 'Public profile disabled'
                        )
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
        [isGuest, userId, visibility, updateVisibility, showSuccess, showError]
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
