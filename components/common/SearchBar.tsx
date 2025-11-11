/**
 * SearchBar - Standardized search input
 * Consistent styling and behavior across all pages
 */

'use client'

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
    focusColor?: 'purple' | 'green' | 'blue' | 'gray'
    /** Enable voice input */
    voiceInput?: boolean
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    focusColor = 'purple',
    voiceInput = false,
}: SearchBarProps) {
    const { showError } = useToast()

    const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
        onResult: (transcript) => {
            onChange(transcript)
        },
        onError: (error) => {
            showError(error)
        },
    })

    const focusColorClasses = {
        purple: 'focus:ring-purple-500',
        green: 'focus:ring-green-500',
        blue: 'focus:ring-blue-500',
        gray: 'focus:ring-gray-400',
    }

    const handleVoiceClick = () => {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
    }

    return (
        <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder={placeholder}
                className={`w-full pl-10 ${voiceInput && isSupported ? 'pr-12' : 'pr-4'} py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${focusColorClasses[focusColor]} focus:border-transparent transition-all duration-200`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {voiceInput && isSupported && (
                <button
                    type="button"
                    onClick={handleVoiceClick}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 ${
                        isListening
                            ? 'text-red-500 animate-pulse'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                    <MicrophoneIcon className="h-5 w-5" />
                </button>
            )}
        </div>
    )
}
