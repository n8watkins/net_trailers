/**
 * SearchBar - Standardized search input
 * Consistent styling and behavior across all pages
 */

'use client'

import { useEffect } from 'react'
import { MagnifyingGlassIcon, MicrophoneIcon } from '@heroicons/react/24/outline'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'

interface SearchBarProps {
    /** Current search query value */
    value: string
    /** Callback when search value changes */
    onChange: (value: string) => void
    /** Placeholder text */
    placeholder?: string
    /** Focus ring color theme */
    focusColor?: 'purple' | 'green' | 'blue' | 'gray' | 'yellow'
    /** Enable voice input */
    voiceInput?: boolean
    /** Optional DOM id for the underlying input */
    inputId?: string
    /** Optional stable identifier for the shared voice controller */
    voiceSourceId?: string
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    focusColor = 'purple',
    voiceInput = false,
    inputId,
    voiceSourceId,
}: SearchBarProps) {
    const { showError } = useToast()

    const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceInput({
        onResult: (transcript) => {
            onChange(transcript)
        },
        onError: (error) => {
            showError(error)
        },
        sourceId: voiceSourceId,
    })

    useEffect(() => {
        if (!voiceInput) return
        if (isListening && transcript) {
            onChange(transcript)
        }
    }, [voiceInput, isListening, transcript, onChange])

    const focusColorClasses = {
        purple: 'focus:ring-purple-500',
        green: 'focus:ring-green-500',
        blue: 'focus:ring-blue-500',
        gray: 'focus:ring-gray-400',
        yellow: 'focus:ring-yellow-500',
    }

    const handleVoiceClick = async () => {
        if (isListening) {
            stopListening()
        } else {
            await startListening()
        }
    }

    return (
        <div className="relative w-full sm:max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder={placeholder}
                id={inputId}
                className={`w-full pl-10 ${voiceInput && isSupported ? 'pr-12' : 'pr-4'} py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${focusColorClasses[focusColor]} focus:border-transparent transition-all duration-200`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {voiceInput && isSupported && (
                <button
                    type="button"
                    onClick={handleVoiceClick}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-200 ${
                        isListening ? '!text-red-500' : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isListening}
                >
                    <div className="relative">
                        {/* Animated pulsing rings when listening */}
                        {isListening && (
                            <>
                                <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                                <span
                                    className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse"
                                    style={{ animationDuration: '1s' }}
                                />
                                <span
                                    className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"
                                    style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}
                                />
                            </>
                        )}
                        <MicrophoneIcon
                            className={`h-5 w-5 relative z-10 transition-all ${
                                isListening
                                    ? 'scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] !text-red-500'
                                    : ''
                            }`}
                        />
                    </div>
                </button>
            )}
        </div>
    )
}
