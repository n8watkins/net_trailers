/**
 * Image Upload Component
 *
 * Allows users to upload up to 4 images with drag-and-drop and preview
 */

'use client'

import { useState, useCallback, useId, useRef, forwardRef, useImperativeHandle } from 'react'
import Image from 'next/image'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { uploadImages, isValidImageFile, formatFileSize } from '@/utils/imageUpload'

interface ImageUploadProps {
    maxImages?: number
    onImagesChange: (imageUrls: string[]) => void
    storagePath: string
    disabled?: boolean
    showDropzone?: boolean
}

export interface ImageUploadHandle {
    openFilePicker: () => void
}

const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(function ImageUpload(
    { maxImages = 4, onImagesChange, storagePath, disabled = false, showDropzone = true },
    ref
) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputId = useId()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const openFilePicker = useCallback(() => {
        if (disabled) return
        fileInputRef.current?.click()
    }, [disabled])

    useImperativeHandle(
        ref,
        () => ({
            openFilePicker,
        }),
        [openFilePicker]
    )

    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files || disabled) return

            setError(null)

            // Convert FileList to array
            const fileArray = Array.from(files)

            // Validate total number of files
            if (selectedFiles.length + fileArray.length > maxImages) {
                setError(`Maximum ${maxImages} images allowed`)
                return
            }

            // Validate each file
            const validFiles: File[] = []
            const invalidFiles: string[] = []

            fileArray.forEach((file) => {
                if (isValidImageFile(file)) {
                    validFiles.push(file)
                } else {
                    invalidFiles.push(file.name)
                }
            })

            if (invalidFiles.length > 0) {
                setError(`Invalid files: ${invalidFiles.join(', ')} (must be images under 5MB)`)
                return
            }

            // Create preview URLs
            const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file))

            setSelectedFiles((prev) => [...prev, ...validFiles])
            setPreviewUrls((prev) => [...prev, ...newPreviewUrls])
        },
        [selectedFiles, maxImages, disabled]
    )

    const handleRemoveFile = useCallback(
        (index: number) => {
            if (disabled) return

            // Revoke object URL to free memory
            URL.revokeObjectURL(previewUrls[index])

            setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
            setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
            setUploadedUrls((prev) => {
                const newUrls = prev.filter((_, i) => i !== index)
                onImagesChange(newUrls)
                return newUrls
            })
        },
        [previewUrls, disabled, onImagesChange]
    )

    const handleUpload = useCallback(async () => {
        if (selectedFiles.length === 0 || isUploading || disabled) return

        setIsCompressing(true)
        setIsUploading(true)
        setError(null)

        try {
            // Compression happens automatically in uploadImages
            setIsCompressing(false)
            const urls = await uploadImages(selectedFiles, storagePath)
            setUploadedUrls(urls)
            onImagesChange(urls)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload images')
        } finally {
            setIsCompressing(false)
            setIsUploading(false)
        }
    }, [selectedFiles, storagePath, onImagesChange, isUploading, disabled])

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault()
            if (disabled) return
            handleFileSelect(e.dataTransfer.files)
        },
        [handleFileSelect, disabled]
    )

    const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
    }, [])

    return (
        <div className="space-y-3">
            <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id={inputId}
                disabled={disabled}
                ref={fileInputRef}
            />

            {/* Upload area */}
            {showDropzone && selectedFiles.length < maxImages && !disabled && (
                <label
                    htmlFor={inputId}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="block border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-600 transition-colors cursor-pointer"
                >
                    <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-400 mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">
                        PNG, JPG, GIF up to 5MB (max {maxImages} images)
                    </p>
                </label>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Preview grid */}
            {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {previewUrls.map((url, index) => (
                        <div
                            key={index}
                            className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group"
                        >
                            <Image
                                src={url}
                                alt={`Preview ${index + 1}`}
                                fill
                                className="object-cover"
                            />

                            {/* Remove button */}
                            {!disabled && (
                                <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    type="button"
                                >
                                    <XMarkIcon className="w-4 h-4 text-white" />
                                </button>
                            )}

                            {/* File info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white truncate">
                                    {selectedFiles[index]?.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {formatFileSize(selectedFiles[index]?.size || 0)}
                                </p>
                            </div>

                            {/* Upload status */}
                            {uploadedUrls[index] && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 rounded text-xs text-white">
                                    Uploaded
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload button */}
            {selectedFiles.length > 0 && uploadedUrls.length === 0 && !disabled && (
                <div className="space-y-2">
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                    >
                        {isCompressing
                            ? 'Compressing images...'
                            : isUploading
                              ? 'Uploading...'
                              : `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Image' : 'Images'}`}
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                        Images will be automatically optimized before upload
                    </p>
                </div>
            )}
        </div>
    )
})

export default ImageUpload
