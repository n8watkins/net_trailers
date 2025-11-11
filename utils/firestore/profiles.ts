/**
 * Profile Firestore Utilities
 *
 * Handles all Firestore operations for user profiles:
 * - Create/read/update profiles
 * - Username availability and mapping
 * - Avatar management (Firebase Storage)
 * - Profile statistics
 */

import { nanoid } from 'nanoid'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    increment,
    runTransaction,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../../firebase'
import {
    UserProfile,
    UpdateProfileRequest,
    UsernameAvailability,
    validateAvatarFile,
    validateAvatarDimensions,
} from '../../types/profile'
import { validateUsername } from '../usernameValidation'
import { NotFoundError, AlreadyExistsError } from './errors'
import { validateProfileUpdate, validateUserId } from './validation'

/**
 * Get Firestore document reference for a profile
 */
function getProfileDocRef(userId: string) {
    return doc(db, `profiles/${userId}`)
}

/**
 * Get Firestore document reference for username mapping
 */
function getUsernameDocRef(username: string) {
    return doc(db, `usernames/${username}`)
}

/**
 * Create a new profile
 */
export async function createProfile(profile: UserProfile): Promise<void> {
    validateUserId(profile.userId)

    await runTransaction(db, async (transaction) => {
        // 1. Check if profile already exists
        const profileRef = getProfileDocRef(profile.userId)
        const profileDoc = await transaction.get(profileRef)

        if (profileDoc.exists()) {
            throw new AlreadyExistsError('Profile', profile.userId)
        }

        // 2. Check if username is available
        const usernameRef = getUsernameDocRef(profile.username)
        const usernameDoc = await transaction.get(usernameRef)

        if (usernameDoc.exists()) {
            throw new AlreadyExistsError('Username', profile.username)
        }

        // 3. Create profile document
        transaction.set(profileRef, profile)

        // 4. Create username mapping
        transaction.set(usernameRef, {
            userId: profile.userId,
            createdAt: Date.now(),
        })
    })
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
    try {
        const profileRef = getProfileDocRef(userId)
        const profileDoc = await getDoc(profileRef)

        if (!profileDoc.exists()) {
            return null
        }

        return profileDoc.data() as UserProfile
    } catch (error) {
        console.error('Error getting profile:', error)
        throw error
    }
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
    try {
        // 1. Get userId from username mapping
        const usernameRef = getUsernameDocRef(username)
        const usernameDoc = await getDoc(usernameRef)

        if (!usernameDoc.exists()) {
            return null
        }

        const { userId } = usernameDoc.data()

        // 2. Get profile with that userId
        return await getProfile(userId)
    } catch (error) {
        console.error('Error getting profile by username:', error)
        throw error
    }
}

/**
 * Update profile
 */
export async function updateProfile(userId: string, updates: UpdateProfileRequest): Promise<void> {
    validateUserId(userId)
    validateProfileUpdate(updates)

    const profileRef = getProfileDocRef(userId)

    // If updating username, need transaction for atomicity
    if (updates.username) {
        await runTransaction(db, async (transaction) => {
            // Get current profile
            const profileDoc = await transaction.get(profileRef)
            if (!profileDoc.exists()) {
                throw new NotFoundError('Profile', userId)
            }

            const currentProfile = profileDoc.data() as UserProfile
            const oldUsername = currentProfile.username

            // Check if new username is available
            const newUsernameRef = getUsernameDocRef(updates.username!)
            const newUsernameDoc = await transaction.get(newUsernameRef)

            if (newUsernameDoc.exists() && updates.username !== oldUsername) {
                throw new AlreadyExistsError('Username', updates.username)
            }

            // Trim text fields
            const sanitizedUpdates = {
                ...updates,
                description: updates.description?.trim(),
            }

            // Update profile
            transaction.update(profileRef, {
                ...sanitizedUpdates,
                updatedAt: Date.now(),
            })

            // Update username mapping if changed
            if (updates.username !== oldUsername) {
                // Delete old username mapping
                const oldUsernameRef = getUsernameDocRef(oldUsername)
                transaction.delete(oldUsernameRef)

                // Create new username mapping
                transaction.set(newUsernameRef, {
                    userId,
                    createdAt: Date.now(),
                })
            }
        })
    } else {
        // Simple update without username change
        // Trim text fields
        const sanitizedUpdates = {
            ...updates,
            description: updates.description?.trim(),
        }

        await updateDoc(profileRef, {
            ...sanitizedUpdates,
            updatedAt: Date.now(),
        })
    }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(
    username: string,
    currentUserId?: string
): Promise<UsernameAvailability> {
    try {
        // Validate format
        const validation = validateUsername(username)
        if (!validation.isValid) {
            return {
                available: false,
                error: validation.error,
            }
        }

        // Check if username exists
        const usernameRef = getUsernameDocRef(username)
        const usernameDoc = await getDoc(usernameRef)

        if (!usernameDoc.exists()) {
            return { available: true }
        }

        // If it exists, check if it's the current user's username
        const { userId } = usernameDoc.data()
        if (currentUserId && userId === currentUserId) {
            return { available: true } // User can keep their current username
        }

        return {
            available: false,
            error: 'Username is already taken',
        }
    } catch (error) {
        console.error('Error checking username availability:', error)
        return {
            available: false,
            error: 'Could not verify username availability',
        }
    }
}

/**
 * Upload avatar to Firebase Storage
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
    try {
        // Validate file
        const fileValidation = validateAvatarFile(file)
        if (!fileValidation.isValid) {
            throw new Error(fileValidation.message)
        }

        // Validate dimensions
        const dimensionValidation = await validateAvatarDimensions(file)
        if (!dimensionValidation.isValid) {
            throw new Error(dimensionValidation.message)
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop()
        const filename = `${userId}_${nanoid(8)}.${fileExtension}`
        const avatarRef = ref(storage, `avatars/${filename}`)

        // Upload file
        await uploadBytes(avatarRef, file)

        // Get download URL
        const downloadURL = await getDownloadURL(avatarRef)

        // Update profile with new avatar URL
        const profileRef = getProfileDocRef(userId)
        await updateDoc(profileRef, {
            avatarUrl: downloadURL,
            avatarSource: 'custom',
            customAvatarUrl: downloadURL,
            updatedAt: Date.now(),
        })

        return downloadURL
    } catch (error) {
        console.error('Error uploading avatar:', error)
        throw error
    }
}

/**
 * Delete custom avatar from Firebase Storage
 */
export async function deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
        // Extract path from URL
        const url = new URL(avatarUrl)
        const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '')

        if (!path) {
            throw new Error('Invalid avatar URL')
        }

        // Delete from storage
        const avatarRef = ref(storage, path)
        await deleteObject(avatarRef)
    } catch (error) {
        // Log but don't throw - avatar might already be deleted or URL invalid
        console.warn('Could not delete avatar from storage:', error)
    }
}

/**
 * Increment profile statistics
 */
export async function incrementProfileStats(
    userId: string,
    field: 'rankingsCount' | 'publicCollectionsCount' | 'totalLikes' | 'totalViews',
    amount: number = 1
): Promise<void> {
    try {
        const profileRef = getProfileDocRef(userId)
        await updateDoc(profileRef, {
            [field]: increment(amount),
            updatedAt: Date.now(),
        })
    } catch (error) {
        console.error('Error incrementing profile stats:', error)
        throw error
    }
}

/**
 * Get multiple profiles by user IDs
 * Useful for displaying creator info on rankings
 */
export async function getProfilesByUserIds(userIds: string[]): Promise<Map<string, UserProfile>> {
    try {
        const profiles = new Map<string, UserProfile>()

        // Firestore has a limit of 10 items for 'in' queries
        const batchSize = 10
        const batches = []

        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize)
            batches.push(batch)
        }

        // Fetch all batches
        for (const batch of batches) {
            const promises = batch.map((userId) => getProfile(userId))
            const results = await Promise.all(promises)

            results.forEach((profile, index) => {
                if (profile) {
                    profiles.set(batch[index], profile)
                }
            })
        }

        return profiles
    } catch (error) {
        console.error('Error getting profiles by user IDs:', error)
        throw error
    }
}

/**
 * Search profiles by username (partial match)
 * Used for user search functionality
 */
export async function searchProfiles(
    searchQuery: string,
    limit: number = 20
): Promise<UserProfile[]> {
    try {
        const profilesRef = collection(db, 'profiles')

        // Firestore doesn't support full-text search natively
        // This is a simple implementation - for production, use Algolia or similar
        const q = query(
            profilesRef,
            where('isPublic', '==', true),
            orderBy('username'),
            firestoreLimit(limit)
        )

        const snapshot = await getDocs(q)
        const profiles: UserProfile[] = []

        snapshot.forEach((doc) => {
            const profile = doc.data() as UserProfile
            // Client-side filtering for partial match
            if (profile.username.toLowerCase().includes(searchQuery.toLowerCase())) {
                profiles.push(profile)
            }
        })

        return profiles
    } catch (error) {
        console.error('Error searching profiles:', error)
        throw error
    }
}
