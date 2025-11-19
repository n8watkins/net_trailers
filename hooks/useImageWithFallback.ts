import { useState, useEffect } from 'react'
import { Content, isMovie } from '../typings'

/**
 * Custom hook for image loading with 4-tier fallback:
 * 1. poster_path (from original response)
 * 2. backdrop_path (from original response)
 * 3. Alternate images (fetch from TMDB /images endpoint)
 * 4. Placeholder (null)
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

    // Fetch alternate images from TMDB when both poster and backdrop fail
    useEffect(() => {
        if (posterError && backdropError && !alternateImage && !fetchingAlternate && content) {
            setFetchingAlternate(true)
            const mediaType = isMovie(content) ? 'movie' : 'tv'
            const apiKey =
                process.env.NEXT_PUBLIC_TMDB_API_KEY || '96fa23e76f0d41cb36975d635d344e2a'

            fetch(
                `https://api.themoviedb.org/3/${mediaType}/${content.id}/images?api_key=${apiKey}`
            )
                .then((res) => res.json())
                .then((data) => {
                    const posters = data.posters || []
                    const backdrops = data.backdrops || []

                    const sortedPosters = [...posters].sort(
                        (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
                    )
                    const sortedBackdrops = [...backdrops].sort(
                        (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
                    )

                    const bestImage = sortedPosters[0] || sortedBackdrops[0]

                    if (bestImage?.file_path) {
                        setAlternateImage(`https://image.tmdb.org/t/p/w185${bestImage.file_path}`)
                    } else {
                        setAlternateError(true)
                    }
                })
                .catch(() => {
                    setAlternateError(true)
                })
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
