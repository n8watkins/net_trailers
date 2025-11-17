'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import ProfileSection from '../../../components/settings/ProfileSection'

const ProfilePage: React.FC = () => {
    const router = useRouter()
    const { user } = useAuth()
    const { isGuest } = useAuthStatus()
    const { showSuccess, showError } = useToast()

    // Profile form state
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

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
        />
    )
}

export default ProfilePage
