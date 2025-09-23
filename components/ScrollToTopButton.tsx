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
            behavior: 'smooth',
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
                bg-red-600
                text-white
                w-12 h-12
                rounded-full
                flex items-center justify-center
                transition-all duration-300 ease-in-out
                hover:scale-110
                shadow-xl
                group
            "
            aria-label="Scroll to top"
        >
            <ChevronUpIcon className="h-6 w-6" />
        </button>
    )
}

export default ScrollToTopButton
