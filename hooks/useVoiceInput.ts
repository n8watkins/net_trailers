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
    startListening: () => Promise<void>
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
    const permissionCheckedRef = useRef(false)

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

    const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
        try {
            // Request microphone permission directly - this will show the browser prompt
            // We're NOT checking Permissions API first because it can return stale cached data
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log('Requesting microphone permission via getUserMedia...')
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                console.log('✅ Microphone permission granted!')
                // Stop the stream immediately - we only needed the permission
                stream.getTracks().forEach((track) => track.stop())
                return true
            } else {
                console.error('getUserMedia not supported')
                if (onError) {
                    onError('Your browser does not support microphone access.')
                }
                return false
            }
        } catch (error: any) {
            console.error('❌ Permission request failed:', error.name, error.message)

            if (
                error.name === 'NotAllowedError' ||
                error.name === 'PermissionDeniedError' ||
                error.message?.includes('denied')
            ) {
                if (onError) {
                    onError(
                        'Microphone access denied. Click the lock icon (🔒) in your browser address bar, set Microphone to "Allow", then refresh the page and try again.'
                    )
                }
            } else if (error.name === 'NotFoundError') {
                if (onError) {
                    onError('No microphone found. Please connect a microphone and try again.')
                }
            } else {
                if (onError) {
                    onError(`Microphone error: ${error.message || 'Unknown error'}`)
                }
            }
            return false
        }
    }, [onError])

    const startListening = useCallback(async () => {
        if (!isSupported) {
            if (onError) {
                onError('Speech recognition is not supported in this browser.')
            }
            return
        }

        // Check if site is using HTTPS (required for microphone access)
        if (
            typeof window !== 'undefined' &&
            window.location.protocol !== 'https:' &&
            window.location.hostname !== 'localhost'
        ) {
            if (onError) {
                onError('Microphone access requires HTTPS. Please use a secure connection.')
            }
            return
        }

        if (recognitionRef.current && !isListening) {
            setTranscript('')

            // Check and request microphone permission first
            const hasPermission = await checkMicrophonePermission()
            if (!hasPermission) {
                return // Error already shown by checkMicrophonePermission
            }

            try {
                // Now start speech recognition with permission already granted
                console.log('Starting speech recognition...')
                recognitionRef.current.start()
                setIsListening(true)
            } catch (error: any) {
                console.error('Failed to start speech recognition:', error)
                setIsListening(false)

                // Handle specific error cases
                if (error.message?.includes('already started')) {
                    // Recognition already running, ignore
                    setIsListening(true)
                } else {
                    if (onError) {
                        onError('Failed to start voice input. Please try again.')
                    }
                }
            }
        }
    }, [isSupported, isListening, onError, checkMicrophonePermission])

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
