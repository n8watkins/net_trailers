'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    SparklesIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useTypewriter } from '../../hooks/useTypewriter'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'

export default function SmartSearchInput() {
    const router = useRouter()
    const { query, isActive, setQuery, setActive, reset } = useSmartSearchStore()
    const { showError } = useToast()

    const [localQuery, setLocalQuery] = useState(query)
    const inputRef = useRef<HTMLInputElement>(null)

    // 30 vibe-focused search examples
    const searchExamples = [
        'neo-like characters',
        'Keanu Reeves comedies',
        'dark superheroes finding redemption',
        'mind-bending time travel',
        'strong female leads kicking ass',
        'quirky indie rom-coms',
        'clever heist movies',
        'dystopian futures with hope',
        'gripping true crime',
        'Denzel Washington action',
        'psychological thrillers',
        'epic space battles',
        'underdog sports comebacks',
        'animated films that hit deep',
        'detective stories with wit',
        'found footage scares',
        'royal family drama',
        'revenge with consequences',
        'buddy cop banter',
        'dragons and fantasy worlds',
        'controversial biopics',
        'romantic escapes to Paris',
        'survival against all odds',
        'AI taking over',
        'feel-good second chances',
        'classic noir vibes',
        'music biopics',
        'trippy art films',
        '80s nostalgia',
        'mysterious islands',
    ]

    // Typing animation for the dynamic part after "I feel like watching"
    const typewriterText = useTypewriter({
        words: searchExamples,
        typeSpeed: 60,
        deleteSpeed: 30,
        delayBetweenWords: 2500,
        loop: true,
    })

    // Use just the dynamic typewriter text as placeholder
    const placeholderText = typewriterText ? typewriterText : 'Describe what you want to watch...'

    // Voice input
    const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceInput({
        onResult: (finalTranscript) => {
            setLocalQuery(finalTranscript)
        },
        onError: (error) => {
            showError('Voice input error', error)
        },
    })

    // Show live transcript while listening
    useEffect(() => {
        if (isListening && transcript) {
            setLocalQuery(transcript)
        }
    }, [transcript, isListening])

    // Sync local query with store
    useEffect(() => {
        setLocalQuery(query)
    }, [query])

    const handleFocus = () => {
        setActive(true)
    }

    const handleBlur = () => {
        setActive(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setLocalQuery(value)
    }

    const handleClear = () => {
        setLocalQuery('')
        setQuery('')
        reset()
        // Keep suggestions active, don't blur or deactivate
        inputRef.current?.focus()
    }

    const handleVoiceToggle = async () => {
        if (isListening) {
            stopListening()
        } else {
            await startListening()
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (localQuery.trim()) {
            setQuery(localQuery.trim())
            setActive(false)
            inputRef.current?.blur()
            // Navigate to smart search page with query
            router.push(`/smartsearch?q=${encodeURIComponent(localQuery.trim())}`)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <div
                className={`
              relative flex items-center
              transition-all duration-300 ease-out
              rounded-2xl overflow-hidden
              ${
                  isActive
                      ? 'bg-black/50 backdrop-blur-xl shadow-[0_0_25px_rgba(239,68,68,0.6)]'
                      : 'bg-white/5 backdrop-blur-lg'
              }
            `}
            >
                {/* AI Sparkles Icon */}
                <div className="absolute left-3 sm:left-4 pointer-events-none">
                    <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-400" />
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={localQuery}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={
                        localQuery ? 'Describe what you want to watch...' : placeholderText
                    }
                    className="
                w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-4 sm:py-5
                bg-transparent text-white placeholder-gray-400
                focus:outline-none
                text-base sm:text-lg md:text-xl
              "
                />

                {/* Search, Voice, and Clear Buttons */}
                <div className="absolute right-3 sm:right-4 flex items-center gap-1">
                    {/* Listening Indicator */}
                    {isListening && (
                        <span className="text-xs text-red-400 mr-1 animate-pulse font-medium">
                            Listening...
                        </span>
                    )}

                    {/* Clear Button - only visible when there's text, appears FIRST (left side) */}
                    {localQuery && !isListening && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="
                      p-1 rounded-full
                      hover:bg-black/20
                      transition-colors
                    "
                            aria-label="Clear search"
                        >
                            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-400 hover:text-white" />
                        </button>
                    )}

                    {/* Voice Input Button - only visible when supported */}
                    {isSupported && (
                        <button
                            type="button"
                            onClick={handleVoiceToggle}
                            className={`
                      p-1 rounded-full
                      transition-all
                      ${isListening ? 'bg-red-500/20 animate-pulse' : 'hover:bg-black/20'}
                    `}
                            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                        >
                            <MicrophoneIcon
                                className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 transition-colors ${
                                    isListening
                                        ? 'text-red-400'
                                        : 'text-gray-500 hover:text-red-400'
                                }`}
                            />
                        </button>
                    )}

                    {/* Search/Submit Button - always visible, appears LAST (right side) */}
                    <button
                        type="submit"
                        className="
                  p-1 rounded-full
                  hover:bg-black/20
                  transition-colors
                  cursor-pointer
                "
                        aria-label="Search"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-500 hover:text-red-400 transition-colors" />
                    </button>
                </div>
            </div>

            {/* Hint text - always visible */}
            <p className="mt-2 text-center text-xs text-gray-400/80">Use @actor or :movie to tag</p>
        </form>
    )
}
