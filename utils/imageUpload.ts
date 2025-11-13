/**
 * Image Upload Utilities
 *
 * Handles uploading images to Firebase Storage for forum content
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase'

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload
 * @param path - The storage path (e.g., 'forum/threads/{threadId}')
 * @returns Promise<string> - The download URL of the uploaded image
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image')
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB in bytes
        if (file.size > maxSize) {
            throw new Error('Image size must be less than 5MB')
        }

        // Create a unique filename using timestamp and random string
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 15)
        const extension = file.name.split('.').pop()
        const filename = `${timestamp}_${randomStr}.${extension}`

        // Create storage reference
        const storageRef = ref(storage, `${path}/${filename}`)

        // Upload file
        await uploadBytes(storageRef, file)

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef)

        return downloadURL
    } catch (error) {
        console.error('Error uploading image:', error)
        throw error
    }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param path - The storage path (e.g., 'forum/threads/{threadId}')
 * @returns Promise<string[]> - Array of download URLs
 */
export async function uploadImages(files: File[], path: string): Promise<string[]> {
    try {
        // Validate number of files (max 4 images per post)
        if (files.length > 4) {
            throw new Error('Maximum 4 images allowed per post')
        }

        // Upload all files in parallel
        const uploadPromises = files.map((file) => uploadImage(file, path))
        const downloadURLs = await Promise.all(uploadPromises)

        return downloadURLs
    } catch (error) {
        console.error('Error uploading images:', error)
        throw error
    }
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The download URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    try {
        // Extract storage path from URL
        const storageRef = ref(storage, imageUrl)
        await deleteObject(storageRef)
    } catch (error) {
        console.error('Error deleting image:', error)
        throw error
    }
}

/**
 * Delete multiple images from Firebase Storage
 * @param imageUrls - Array of download URLs to delete
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
    try {
        const deletePromises = imageUrls.map((url) => deleteImage(url))
        await Promise.all(deletePromises)
    } catch (error) {
        console.error('Error deleting images:', error)
        throw error
    }
}

/**
 * Validate image file
 * @param file - The file to validate
 * @returns boolean - True if valid, false otherwise
 */
export function isValidImageFile(file: File): boolean {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return false
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
        return false
    }

    return true
}

/**
 * Get file size in human-readable format
 * @param bytes - File size in bytes
 * @returns string - Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
