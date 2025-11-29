'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '../../../hooks/useAuth'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import AccountManagementSection from '../../../components/settings/AccountManagementSection'

const AccountManagementPage: React.FC = () => {
    const router = useRouter()
    const { user, sendVerificationEmail } = useAuth()
    const { isGuest } = useAuthStatus()
    const { showSuccess, showError } = useToast()

    // Email form state
    const [newEmail, setNewEmail] = useState('')
    const [emailPassword, setEmailPassword] = useState('')
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
    const [isSendingVerification, setIsSendingVerification] = useState(false)

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

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

    const handleSendVerificationEmail = async () => {
        if (!user) {
            showError('No user found to verify.')
            return
        }

        setIsSendingVerification(true)
        try {
            await sendVerificationEmail()
        } finally {
            setIsSendingVerification(false)
        }
    }

    // Redirect guests to preferences
    React.useEffect(() => {
        if (isGuest) {
            router.push('/settings/preferences')
        }
    }, [isGuest, router])

    // Email form handler
    const handleUpdateEmail = async () => {
        if (isUpdatingEmail) return
        if (!user) {
            showError('No user found')
            return
        }

        // Validation
        if (!newEmail.trim()) {
            showError('Please enter a new email address')
            return
        }
        if (!emailPassword.trim()) {
            showError('Please enter your current password to confirm')
            return
        }
        if (newEmail.trim() === user.email) {
            showError('New email must be different from current email')
            return
        }

        setIsUpdatingEmail(true)
        try {
            const { auth } = await import('../../../firebase')
            const { updateEmail, EmailAuthProvider, reauthenticateWithCredential } = await import(
                'firebase/auth'
            )

            if (!auth.currentUser || !auth.currentUser.email) {
                throw new Error('No authenticated user found')
            }

            // Re-authenticate user first (required for sensitive operations)
            const credential = EmailAuthProvider.credential(auth.currentUser.email, emailPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)

            // Update email
            await updateEmail(auth.currentUser, newEmail.trim())

            // Clear form
            setNewEmail('')
            setEmailPassword('')
            showSuccess('Email updated successfully!')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error updating email:', error)
            let message = 'Failed to update email. Please try again.'
            if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password. Please try again.'
            } else if (error.code === 'auth/email-already-in-use') {
                message = 'This email is already in use by another account.'
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address format.'
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Please sign out and sign in again before changing your email.'
            }
            showError(message)
        } finally {
            setIsUpdatingEmail(false)
        }
    }

    // Password form handler
    const handleUpdatePassword = async () => {
        if (isUpdatingPassword) return
        if (!user) {
            showError('No user found')
            return
        }

        // Validation
        if (!currentPassword.trim()) {
            showError('Please enter your current password')
            return
        }
        if (!newPassword.trim()) {
            showError('Please enter a new password')
            return
        }
        if (newPassword.length < 6) {
            showError('New password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match')
            return
        }
        if (newPassword === currentPassword) {
            showError('New password must be different from current password')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const { auth } = await import('../../../firebase')
            const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } =
                await import('firebase/auth')

            if (!auth.currentUser || !auth.currentUser.email) {
                throw new Error('No authenticated user found')
            }

            // Re-authenticate user first (required for sensitive operations)
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)

            // Update password
            await updatePassword(auth.currentUser, newPassword)

            // Clear form
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            showSuccess('Password updated successfully!')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error updating password:', error)
            let message = 'Failed to update password. Please try again.'
            if (error.code === 'auth/wrong-password') {
                message = 'Incorrect current password. Please try again.'
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak. Please choose a stronger password.'
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Please sign out and sign in again before changing your password.'
            }
            showError(message)
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    if (isGuest) {
        return null // Will redirect
    }

    return (
        <AccountManagementSection
            user={user}
            isGoogleAuth={isGoogleAuth}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            emailPassword={emailPassword}
            setEmailPassword={setEmailPassword}
            isUpdatingEmail={isUpdatingEmail}
            onUpdateEmail={handleUpdateEmail}
            isEmailVerified={Boolean(user?.emailVerified)}
            isSendingVerification={isSendingVerification}
            onSendVerification={handleSendVerificationEmail}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isUpdatingPassword={isUpdatingPassword}
            onUpdatePassword={handleUpdatePassword}
        />
    )
}

export default AccountManagementPage
