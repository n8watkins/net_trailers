'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceInputOptions {
    onResult: (transcript: string) => void
    onError?: (error: string) => void
    language?: string
    continuous?: boolean
}

interface UseVoiceInputReturn {
    isListening: boolean
    isSupported: boolean
    transcript: string
    startListening: () => void
    stopListening: () => void
    resetTranscript: () => void
}

export function useVoiceInput({
    onResult,
    onError,
    language = 'en-US',
    continuous = false,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [transcript, setTranscript] = useState('')
    const recognitionRef = useRef<any>(null)

    // Check if browser supports speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            setIsSupported(!!SpeechRecognition)

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = continuous
                recognitionRef.current.interimResults = true
                recognitionRef.current.lang = language

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = ''
                    let interimTranscript = ''

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcriptPiece = event.results[i][0].transcript
                        if (event.results[i].isFinal) {
                            finalTranscript += transcriptPiece
                        } else {
                            interimTranscript += transcriptPiece
                        }
                    }

                    const currentTranscript = finalTranscript || interimTranscript
                    setTranscript(currentTranscript)

                    // Call onResult with final transcript
                    if (finalTranscript) {
                        onResult(finalTranscript)
                        if (!continuous) {
                            setIsListening(false)
                        }
                    }
                }

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error)
                    setIsListening(false)

                    const errorMessage =
                        event.error === 'no-speech'
                            ? 'No speech detected. Please try again.'
                            : event.error === 'not-allowed'
                              ? 'Microphone access denied. Please enable microphone permissions.'
                              : 'Speech recognition error. Please try again.'

                    if (onError) {
                        onError(errorMessage)
                    }
                }

                recognitionRef.current.onend = () => {
                    setIsListening(false)
                }
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [language, continuous, onResult, onError])

    const startListening = useCallback(() => {
        if (!isSupported) {
            if (onError) {
                onError('Speech recognition is not supported in this browser.')
            }
            return
        }

        if (recognitionRef.current && !isListening) {
            setTranscript('')
            try {
                recognitionRef.current.start()
                setIsListening(true)
            } catch (error) {
                console.error('Failed to start recognition:', error)
                if (onError) {
                    onError('Failed to start voice input.')
                }
            }
        }
    }, [isSupported, isListening, onError])

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        }
    }, [isListening])

    const resetTranscript = useCallback(() => {
        setTranscript('')
    }, [])

    return {
        isListening,
        isSupported,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
    }
}
