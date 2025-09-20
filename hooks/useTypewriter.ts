import { useState, useEffect } from 'react'

interface UseTypewriterOptions {
    words: string[]
    typeSpeed?: number
    deleteSpeed?: number
    delayBetweenWords?: number
    loop?: boolean
    maxLength?: number
}

export function useTypewriter({
    words,
    typeSpeed = 100,
    deleteSpeed = 50,
    delayBetweenWords = 2000,
    loop = true,
    maxLength
}: UseTypewriterOptions) {
    const [currentText, setCurrentText] = useState('')
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isWaiting, setIsWaiting] = useState(false)

    useEffect(() => {
        if (words.length === 0) return

        const currentWord = words[currentWordIndex]

        const timeout = setTimeout(() => {
            if (isWaiting) {
                setIsWaiting(false)
                setIsDeleting(true)
                return
            }

            if (isDeleting) {
                // Delete characters
                setCurrentText(prev => prev.slice(0, -1))

                if (currentText === '') {
                    setIsDeleting(false)
                    setCurrentWordIndex(prev =>
                        loop ? (prev + 1) % words.length : Math.min(prev + 1, words.length - 1)
                    )
                }
            } else {
                // Type characters
                setCurrentText(prev => currentWord.slice(0, prev.length + 1))

                if (currentText === currentWord) {
                    setIsWaiting(true)
                }
            }
        }, isWaiting ? delayBetweenWords : isDeleting ? deleteSpeed : typeSpeed)

        return () => clearTimeout(timeout)
    }, [currentText, currentWordIndex, isDeleting, isWaiting, words, typeSpeed, deleteSpeed, delayBetweenWords, loop])

    // Helper function to truncate text with ellipsis if needed
    const getTruncatedText = (text: string) => {
        if (!maxLength || text.length <= maxLength) {
            return text
        }
        return text.substring(0, maxLength - 3) + '...'
    }

    return getTruncatedText(currentText)
}