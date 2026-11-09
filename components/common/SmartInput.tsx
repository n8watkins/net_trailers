'use client'

import { useState, useRef, useEffect } from 'react'
import {
    XMarkIcon,
    MicrophoneIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'
import { getRandomQuery } from '../../constants/surpriseQueries'

// Dice SVG icon component
function DiceIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <circle cx="16" cy="8" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="8" cy="16" r="1" fill="currentColor" />
            <circle cx="16" cy="16" r="1" fill="currentColor" />
        </svg>
    )
}

interface SmartInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    placeholder?: string
    isActive?: boolean
    onFocus?: () => void
    onBlur?: () => void
    disabled?: boolean
    showExamplePlaceholder?: boolean
    size?: 'default' | 'large'
    className?: string
    variant?: 'solid' | 'transparent'
    shimmer?:
        'none' | 'subtle' | 'bold' | 'border' | 'pulse' | 'wave' | 'rainbow' | 'fast' | 'double'
    showSurpriseMe?: boolean
    onSurpriseMe?: () => void
    surpriseIcon?: 'dice' | 'sparkles' // Icon to use for surprise button (default: dice)
    surpriseQueryType?: 'hero' | 'collection' | 'ranking' // Type of query to generate (default: hero)
    voiceSourceId?: string
}

/**
 * SmartInput - Shared AI-powered search input component
 *
 * Features:
 * - Voice input support
 * - Static example placeholder
 * - Clear button
 * - Sparkles icon
 * - Responsive box shadows (natural, hover, active states)
 *
 * Used in:
 * - Hero section (SmartSearchInput)
 * - Collection builder modal (SimplifiedSmartBuilder)
 */
export function SmartInput({
    value,
    onChange,
    onSubmit,
    placeholder,
    isActive = false,
    onFocus,
    onBlur,
    disabled = false,
    showExamplePlaceholder = false,
    size = 'default',
    className = '',
    variant = 'solid',
    shimmer = 'none',
    showSurpriseMe = false,
    onSurpriseMe: _onSurpriseMe,
    surpriseIcon = 'dice',
    surpriseQueryType = 'hero',
    voiceSourceId,
}: SmartInputProps) {
    const { showError } = useToast()
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const [localValue, setLocalValue] = useState(value)
    const [isFocused, setIsFocused] = useState(false)
    const [isGeneratingSurprise, setIsGeneratingSurprise] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // A static example reads better than an animated one and never shifts the layout.
    // Phones get a shorter example so the placeholder stays on one line.
    const [isNarrow, setIsNarrow] = useState(false)
    useEffect(() => {
        const query = window.matchMedia('(max-width: 639px)')
        const update = () => setIsNarrow(query.matches)
        update()
        query.addEventListener('change', update)
        return () => query.removeEventListener('change', update)
    }, [])
    const placeholderText = showExamplePlaceholder
        ? isNarrow
            ? 'Try "cozy mysteries"'
            : 'Describe a mood, e.g. "cozy rainy-day mysteries"'
        : placeholder || 'Describe what you want to watch...'

    // Voice input
    const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceInput({
        onResult: (finalTranscript) => {
            setLocalValue(finalTranscript)
            onChange(finalTranscript)
        },
        onError: (error) => {
            showError('Voice input error', error)
        },
        sourceId: voiceSourceId,
    })

    // Set mounted state after hydration to prevent SSR mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Show live transcript while listening
    useEffect(() => {
        if (isListening && transcript) {
            setLocalValue(transcript)
            onChange(transcript)
        }
    }, [transcript, isListening])

    // Sync local value with prop
    useEffect(() => {
        setLocalValue(value)
    }, [value])

    // Auto-resize textarea when the value or placeholder changes (including programmatic changes)
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            const lineHeight = parseInt(getComputedStyle(inputRef.current).lineHeight)
            const maxHeight = lineHeight * 3 // 3 lines max
            const newHeight = Math.min(inputRef.current.scrollHeight, maxHeight)
            inputRef.current.style.height = newHeight + 'px'
        }
        // The placeholder counts too: it changes length on phones after mount
    }, [localValue, placeholderText])

    const handleFocus = () => {
        setIsFocused(true)
        onFocus?.()
    }

    const handleBlur = () => {
        setIsFocused(false)
        onBlur?.()
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)
        onChange(newValue)

        // Auto-resize textarea with 3-line max
        e.target.style.height = 'auto'
        const lineHeight = parseInt(getComputedStyle(e.target).lineHeight)
        const maxHeight = lineHeight * 3 // 3 lines max
        const newHeight = Math.min(e.target.scrollHeight, maxHeight)
        e.target.style.height = newHeight + 'px'
    }

    const handleClear = () => {
        setLocalValue('')
        onChange('')
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
        if (localValue.trim()) {
            onSubmit()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift), allow Shift+Enter for new lines
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (localValue.trim()) {
                onSubmit()
            }
        }
    }

    const handleSurpriseMeClick = () => {
        if (isGeneratingSurprise) return

        setIsGeneratingSurprise(true)

        try {
            // Get random query from local array (instant, but add delay for UX animation)
            const query = getRandomQuery(surpriseQueryType)

            // Delay to show satisfying dice animation (600ms)
            setTimeout(() => {
                setLocalValue(query)
                onChange(query)
                inputRef.current?.focus()
                setIsGeneratingSurprise(false)
            }, 600)
        } catch (_error) {
            showError('Failed to generate surprise', 'Please try again')
            setIsGeneratingSurprise(false)
        }
    }

    // Calculate background and shadow classes based on variant and state
    const getBackgroundClasses = () => {
        if (variant === 'transparent') {
            if (isFocused || isActive) {
                return 'bg-black/50 backdrop-blur-xl shadow-[0_0_30px_rgba(251,191,36,0.6)]'
            }
            return 'bg-white/5 backdrop-blur-lg shadow-[0_0_20px_rgba(251,191,36,0.4)]'
        }
        // Solid variant
        if (isFocused || isActive) {
            return 'bg-gray-800 shadow-[0_0_30px_rgba(251,191,36,0.6)]'
        }
        return 'bg-gray-800 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
    }

    // Size-specific classes
    const sizeClasses = {
        default: {
            container: 'rounded-2xl',
            icon: 'h-6 w-6 sm:h-7 sm:w-7',
            input: showSurpriseMe
                ? 'pl-12 sm:pl-14 pr-32 sm:pr-36 py-4 sm:py-5 text-base sm:text-lg md:text-xl leading-relaxed'
                : 'pl-4 sm:pl-5 pr-32 sm:pr-36 py-4 sm:py-5 text-base sm:text-lg md:text-xl leading-relaxed',
            button: 'h-6 w-6 sm:h-7 sm:w-7',
        },
        large: {
            container: 'rounded-2xl',
            icon: 'h-6 w-6 sm:h-7 sm:w-7',
            input: showSurpriseMe
                ? 'pl-12 sm:pl-14 pr-32 sm:pr-36 py-4 sm:py-5 text-base sm:text-lg md:text-xl leading-relaxed'
                : 'pl-4 sm:pl-5 pr-32 sm:pr-36 py-4 sm:py-5 text-base sm:text-lg md:text-xl leading-relaxed',
            button: 'h-6 w-6 sm:h-7 sm:w-7',
        },
    }

    const currentSize = sizeClasses[size]

    // Get shimmer classes based on shimmer type
    const getShimmerClasses = () => {
        switch (shimmer) {
            case 'subtle':
                return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none before:z-10'
            case 'bold':
                return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-amber-300/50 before:to-transparent before:pointer-events-none before:z-10'
            case 'fast':
                return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-amber-300/60 before:to-transparent before:pointer-events-none before:z-10'
            case 'wave':
                return 'shimmer-wave-container'
            case 'rainbow':
                return 'shimmer-rainbow-container'
            case 'double':
                return 'shimmer-double'
            case 'border':
                return 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-transparent animate-pulse-slow'
            case 'pulse':
                return 'animate-glow-pulse'
            default:
                return ''
        }
    }

    return (
        <form onSubmit={handleSubmit} className={`relative w-full ${className}`}>
            {/* Screen reader announcements */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {isListening && 'Voice input active. Listening for your search query.'}
                {!isListening && transcript && 'Voice input stopped. Transcript captured.'}
            </div>

            {/* Shimmer animation styles */}
            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                @keyframes shimmer-diagonal-1 {
                    0% {
                        transform: translateX(-50%) translateY(0%);
                    }
                    100% {
                        transform: translateX(100%) translateY(0%);
                    }
                }
                @keyframes shimmer-diagonal-2 {
                    0% {
                        transform: translateX(-50%) translateY(0%);
                    }
                    100% {
                        transform: translateX(100%) translateY(0%);
                    }
                }
                @keyframes glow-pulse {
                    0%,
                    100% {
                        box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
                    }
                    50% {
                        box-shadow:
                            0 0 40px rgba(251, 191, 36, 0.8),
                            0 0 60px rgba(251, 191, 36, 0.4);
                    }
                }
                @keyframes pulse-slow {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }

                /* Subtle, Bold, Fast shimmer */
                :global(.before\\:z-10::before) {
                    animation: shimmer 3s ease-in-out infinite;
                }

                /* Wave shimmer - multiple staggered diagonal beams */
                :global(.shimmer-wave-container) {
                    position: relative;
                }
                /* First shimmer beam - 110deg */
                :global(.shimmer-wave-container::before) {
                    content: '';
                    position: absolute;
                    inset: 0;
                    width: 200%;
                    height: 200%;
                    top: -50%;
                    left: -100%;
                    background: linear-gradient(
                        110deg,
                        transparent 0%,
                        transparent 25%,
                        rgba(245, 158, 11, 0.12) 35%,
                        rgba(251, 191, 36, 0.18) 40%,
                        rgba(252, 211, 77, 0.22) 45%,
                        rgba(253, 230, 138, 0.25) 50%,
                        rgba(252, 211, 77, 0.22) 55%,
                        rgba(251, 191, 36, 0.18) 60%,
                        rgba(245, 158, 11, 0.12) 65%,
                        transparent 75%,
                        transparent 100%
                    );
                    animation: shimmer-diagonal-1 8s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 10;
                }
                /* Second shimmer beam - 135deg, staggered */
                :global(.shimmer-wave-container::after) {
                    content: '';
                    position: absolute;
                    inset: 0;
                    width: 200%;
                    height: 200%;
                    top: -50%;
                    left: -100%;
                    background: linear-gradient(
                        135deg,
                        transparent 0%,
                        transparent 25%,
                        rgba(245, 158, 11, 0.1) 35%,
                        rgba(251, 191, 36, 0.15) 40%,
                        rgba(252, 211, 77, 0.18) 45%,
                        rgba(253, 230, 138, 0.2) 50%,
                        rgba(252, 211, 77, 0.18) 55%,
                        rgba(251, 191, 36, 0.15) 60%,
                        rgba(245, 158, 11, 0.1) 65%,
                        transparent 75%,
                        transparent 100%
                    );
                    animation: shimmer-diagonal-2 10s ease-in-out infinite 3s;
                    pointer-events: none;
                    z-index: 10;
                }

                /* Rainbow shimmer */
                :global(.shimmer-rainbow-container) {
                    position: relative;
                }
                :global(.shimmer-rainbow-container::before) {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(251, 191, 36, 0.6) 25%,
                        rgba(251, 191, 36, 0.6) 50%,
                        rgba(59, 130, 246, 0.6) 75%,
                        transparent 100%
                    );
                    animation: shimmer 1.5s linear infinite;
                    pointer-events: none;
                    z-index: 10;
                }

                /* Double shimmer */
                :global(.shimmer-double) {
                    position: relative;
                }
                :global(.shimmer-double::before),
                :global(.shimmer-double::after) {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(251, 191, 36, 0.6),
                        transparent
                    );
                    pointer-events: none;
                    z-index: 10;
                }
                :global(.shimmer-double::before) {
                    animation: shimmer 2s ease-in-out infinite;
                }
                :global(.shimmer-double::after) {
                    animation: shimmer 2s ease-in-out infinite 1s;
                }

                /* Other animations */
                :global(.animate-glow-pulse) {
                    animation: glow-pulse 2s ease-in-out infinite;
                }
                :global(.animate-pulse-slow) {
                    animation: pulse-slow 2s ease-in-out infinite;
                }
                /* Spin and pulse animation for dice */
                @keyframes spin-pulse {
                    0% {
                        transform: rotate(0deg) scale(1);
                        filter: brightness(1);
                    }
                    25% {
                        transform: rotate(180deg) scale(0.85);
                        filter: brightness(1.3);
                    }
                    50% {
                        transform: rotate(360deg) scale(1.1);
                        filter: brightness(1.5);
                    }
                    75% {
                        transform: rotate(540deg) scale(0.85);
                        filter: brightness(1.3);
                    }
                    100% {
                        transform: rotate(720deg) scale(1);
                        filter: brightness(1);
                    }
                }
                :global(.animate-spin-pulse) {
                    animation: spin-pulse 0.6s ease-in-out;
                }
            `}</style>

            <div
                className={`
                    relative flex items-center
                    transition-all duration-300 ease-out
                    overflow-hidden
                    hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]
                    ${currentSize.container}
                    ${getBackgroundClasses()}
                    ${getShimmerClasses()}
                `}
            >
                {/* Dice Icon - Surprise Me Button */}
                {showSurpriseMe && (
                    <div className="absolute left-4 z-30">
                        <button
                            type="button"
                            onClick={handleSurpriseMeClick}
                            disabled={disabled || isGeneratingSurprise}
                            title="Surprise me with a search idea"
                            className={`
                                ${currentSize.icon} text-amber-300 hover:text-amber-200
                                cursor-pointer transition-all duration-300
                                disabled:cursor-not-allowed disabled:opacity-50
                                ${isGeneratingSurprise ? 'animate-spin-pulse' : 'hover:scale-110'}
                                relative z-30
                            `}
                            aria-label="Surprise me with a search idea"
                        >
                            {surpriseIcon === 'sparkles' ? (
                                <SparklesIcon className="w-full h-full" />
                            ) : (
                                <DiceIcon className="w-full h-full" />
                            )}
                        </button>
                    </div>
                )}

                {/* Input */}
                <textarea
                    ref={inputRef}
                    value={localValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholderText}
                    rows={1}
                    className={`
                        w-full bg-transparent text-white placeholder-gray-400
                        focus:outline-none relative z-10 resize-none
                        ${currentSize.input}
                    `}
                    style={{
                        overflowY:
                            localValue.split('\n').length > 3 || localValue.length > 200
                                ? 'auto'
                                : 'hidden',
                        minHeight: '1.5em',
                        maxHeight: 'calc(1.75em * 3 + 1rem)', // 3 lines with relaxed line-height plus padding
                    }}
                    disabled={disabled}
                />

                {/* Right side buttons */}
                <div className="absolute right-3 sm:right-4 flex items-center gap-1 z-20">
                    {/* Listening indicator */}
                    {isListening && (
                        <span className="text-xs text-amber-300 mr-1 animate-pulse font-medium">
                            Listening...
                        </span>
                    )}

                    {/* Clear button */}
                    {localValue && !isListening && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-full hover:bg-black/20 transition-colors"
                            aria-label="Clear"
                        >
                            <XMarkIcon
                                className={`${currentSize.button} text-gray-400 hover:text-white transition-colors`}
                            />
                        </button>
                    )}

                    {/* Voice input button - only render after hydration to prevent SSR mismatch */}
                    {isMounted && isSupported && (
                        <button
                            type="button"
                            onClick={handleVoiceToggle}
                            disabled={disabled}
                            className={`
                                relative p-1 rounded-full transition-all duration-200
                                ${isListening ? 'bg-red-500/20 ring-2 ring-red-500/50' : 'hover:bg-black/20'}
                            `}
                            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                            aria-pressed={isListening}
                        >
                            {/* Animated pulsing rings when listening */}
                            {isListening && (
                                <>
                                    <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
                                    <span
                                        className="absolute inset-0 rounded-full bg-amber-400/30 animate-pulse"
                                        style={{ animationDuration: '1s' }}
                                    />
                                    <span
                                        className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse"
                                        style={{
                                            animationDuration: '1.5s',
                                            animationDelay: '0.3s',
                                        }}
                                    />
                                </>
                            )}
                            <MicrophoneIcon
                                className={`
                                    ${currentSize.button} transition-all relative z-10
                                    ${isListening ? '!text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-amber-300 hover:text-amber-200'}
                                `}
                            />
                        </button>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={disabled || !localValue.trim()}
                        className="p-1 rounded-full hover:bg-black/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Submit search"
                    >
                        <MagnifyingGlassIcon
                            className={`${currentSize.button} text-amber-300 hover:text-amber-200 transition-colors`}
                        />
                    </button>
                </div>
            </div>
        </form>
    )
}
