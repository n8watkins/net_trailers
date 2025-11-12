import { useEffect } from 'react'

/**
 * Custom hook to implement auto-hiding scrollbar behavior
 * Shows scrollbar while scrolling, hides after a delay (default 1000ms)
 */
export function useAutoHideScrollbar(hideDelay: number = 1000) {
    useEffect(() => {
        let scrollTimeout: NodeJS.Timeout | null = null

        const handleScroll = () => {
            // Add scrolling class to show scrollbar
            document.body.classList.add('scrolling')

            // Clear existing timeout
            if (scrollTimeout) {
                clearTimeout(scrollTimeout)
            }

            // Set new timeout to hide scrollbar after delay
            scrollTimeout = setTimeout(() => {
                document.body.classList.remove('scrolling')
            }, hideDelay)
        }

        // Add scroll event listener
        window.addEventListener('scroll', handleScroll, { passive: true })

        // Cleanup function
        return () => {
            window.removeEventListener('scroll', handleScroll)
            if (scrollTimeout) {
                clearTimeout(scrollTimeout)
            }
            // Remove class on unmount
            document.body.classList.remove('scrolling')
        }
    }, [hideDelay])
}
