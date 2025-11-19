import { useState } from 'react'
import { Content } from '../typings'

/**
 * Custom hook for image loading with fallback:
 * 1. poster_path (from original response)
 * 2. backdrop_path (from original response)
 * 3. Placeholder (null)
 *
 * Note: We don't fetch alternate images client-side to avoid exposing the API key.
 * TMDB API key must remain server-side only for security.
 */
export function useImageWithFallback(content: Content | undefined) {
    const [posterError, setPosterError] = useState(false)
    const [backdropError, setBackdropError] = useState(false)

    const posterImage = content?.poster_path
    const backdropImage = content?.backdrop_path

    // Determine which image to use
    const imageToUse =
        !posterError && posterImage
            ? `https://image.tmdb.org/t/p/w185${posterImage}`
            : !backdropError && backdropImage
              ? `https://image.tmdb.org/t/p/w185${backdropImage}`
              : null

    // Handle image load errors
    const handleImageError = () => {
        if (!posterError && posterImage) {
            setPosterError(true)
        } else if (!backdropError && backdropImage) {
            setBackdropError(true)
        }
    }

    return { imageToUse, handleImageError }
}
