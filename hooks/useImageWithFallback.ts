import { useState, useEffect } from 'react'
import { Content, isMovie } from '../typings'

/**
 * Custom hook for image loading with fallback:
 * 1. poster_path (from original response)
 * 2. backdrop_path (from original response)
 * 3. Alternate image (fetched from server-side API)
 * 4. Placeholder (null)
 *
 * Alternate images are fetched via server-side API to keep TMDB API key secure.
 */
export function useImageWithFallback(content: Content | undefined) {
    const [posterError, setPosterError] = useState(false)
    const [backdropError, setBackdropError] = useState(false)
    const [alternateImage, setAlternateImage] = useState<string | null>(null)
    const [alternateError, setAlternateError] = useState(false)
    const [fetchingAlternate, setFetchingAlternate] = useState(false)

    const posterImage = content?.poster_path
    const backdropImage = content?.backdrop_path

    // Determine which image to use
    const imageToUse =
        !posterError && posterImage
            ? `https://image.tmdb.org/t/p/w185${posterImage}`
            : !backdropError && backdropImage
              ? `https://image.tmdb.org/t/p/w185${backdropImage}`
              : !alternateError && alternateImage
                ? alternateImage
                : null

    // Fetch alternate images from server-side API when both poster and backdrop fail
    useEffect(() => {
        if (posterError && backdropError && !alternateImage && !fetchingAlternate && content) {
            setFetchingAlternate(true)
            const mediaType = isMovie(content) ? 'movie' : 'tv'

            // Create abort controller for cleanup
            const abortController = new AbortController()

            fetch(`/api/images/${mediaType}/${content.id}`, {
                signal: abortController.signal,
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.imageUrl) {
                        // Use w185 to match the other images in this hook
                        const imageUrl = data.imageUrl.replace('/w500/', '/w185/')
                        setAlternateImage(imageUrl)
                    } else {
                        setAlternateError(true)
                    }
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') {
                        console.error('Failed to fetch alternate images:', error)
                        setAlternateError(true)
                    }
                })
                .finally(() => {
                    setFetchingAlternate(false)
                })

            return () => {
                abortController.abort()
            }
        }
    }, [posterError, backdropError, alternateImage, fetchingAlternate, content])

    // Handle image load errors
    const handleImageError = () => {
        if (!posterError && posterImage) {
            setPosterError(true)
        } else if (!backdropError && backdropImage) {
            setBackdropError(true)
        } else if (!alternateError && alternateImage) {
            setAlternateError(true)
        }
    }

    return { imageToUse, handleImageError }
}
