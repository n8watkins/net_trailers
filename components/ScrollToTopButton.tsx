import { useState, useEffect } from 'react'
import { ChevronUpIcon } from '@heroicons/react/24/solid'

const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false)

    // Show button when page is scrolled down
    useEffect(() => {
        const toggleVisibility = () => {
            const scrollY = window.pageYOffset
            if (scrollY > 300) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        window.addEventListener('scroll', toggleVisibility)

        return () => {
            window.removeEventListener('scroll', toggleVisibility)
        }
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    if (!isVisible) {
        return null
    }

    return (
        <button
            onClick={scrollToTop}
            className="
                fixed bottom-6 right-6 z-[60]
                bg-black bg-opacity-80 hover:bg-opacity-100
                text-white
                w-12 h-12
                rounded-full
                flex items-center justify-center
                transition-all duration-300 ease-in-out
                hover:scale-110
                shadow-xl
                border border-gray-600
                backdrop-blur-sm
                group
            "
            aria-label="Scroll to top"
        >
            <ChevronUpIcon className="h-6 w-6 group-hover:animate-bounce" />

            {/* Netflix-style glow effect */}
            <div className="
                absolute inset-0
                rounded-full
                bg-red-600
                opacity-0
                group-hover:opacity-20
                transition-opacity duration-300
                animate-pulse
            " />
        </button>
    )
}

export default ScrollToTopButton