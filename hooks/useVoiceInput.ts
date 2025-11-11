'use client'
import { devLog } from '../utils/debugLogger'

import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript types for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
}

interface SpeechRecognitionResultList {
    length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
    length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
}

interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
}

interface SpeechRecognitionConstructor {
    new (): SpeechRecognition
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor
        webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
}

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

    // Refs for proper cleanup and callback stability
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const mountedRef = useRef(true)
    const onResultRef = useRef(onResult)
    const onErrorRef = useRef(onError)
    const audioContextRef = useRef<AudioContext | null>(null)
    const isStartingRef = useRef(false) // Prevent multiple simultaneous starts

    // Initialize audio context
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)()
        }
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    // Function to play a beep sound
    const playBeep = useCallback((frequency: number, duration: number) => {
        if (!audioContextRef.current) return

        try {
            const oscillator = audioContextRef.current.createOscillator()
            const gainNode = audioContextRef.current.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContextRef.current.destination)

            oscillator.frequency.value = frequency
            oscillator.type = 'sine'

            // Fade in/out to avoid clicks
            gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.01)
            gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + duration)

            oscillator.start(audioContextRef.current.currentTime)
            oscillator.stop(audioContextRef.current.currentTime + duration)
        } catch (error) {
            console.error('Error playing beep:', error)
        }
    }, [])

    // Keep callback refs up to date
    useEffect(() => {
        onResultRef.current = onResult
        onErrorRef.current = onError
    }, [onResult, onError])

    // Track mounted state to prevent state updates after unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false
        }
    }, [])

    // Initialize speech recognition (only depends on language and continuous)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            setIsSupported(!!SpeechRecognition)

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = continuous
                recognitionRef.current.interimResults = true
                recognitionRef.current.lang = language

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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

                    // Only update state if component is still mounted
                    if (mountedRef.current) {
                        setTranscript(currentTranscript)
                    }

                    // Call onResult with final transcript
                    if (finalTranscript && onResultRef.current) {
                        onResultRef.current(finalTranscript)
                        if (!continuous && mountedRef.current) {
                            setIsListening(false)
                        }
                    }
                }

                recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech recognition error:', event.error)

                    if (mountedRef.current) {
                        setIsListening(false)
                    }

                    const errorMessage =
                        event.error === 'no-speech'
                            ? 'No speech detected. Please try again.'
                            : event.error === 'not-allowed'
                              ? 'Microphone access denied. Please enable microphone permissions.'
                              : 'Speech recognition error. Please try again.'

                    if (onErrorRef.current) {
                        onErrorRef.current(errorMessage)
                    }
                }

                recognitionRef.current.onend = () => {
                    if (mountedRef.current) {
                        setIsListening(false)
                    }
                }
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [language, continuous]) // Fixed: only depend on stable values

    const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
        let stream: MediaStream | null = null

        try {
            // Request microphone permission directly - this will show the browser prompt
            // We're NOT checking Permissions API first because it can return stale cached data
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                devLog('Requesting microphone permission via getUserMedia...')
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                devLog('✅ Microphone permission granted!')
                return true
            } else {
                console.error('getUserMedia not supported')
                if (onErrorRef.current) {
                    onErrorRef.current('Your browser does not support microphone access.')
                }
                return false
            }
        } catch (error: unknown) {
            const err = error as { name?: string; message?: string }
            console.error('❌ Permission request failed:', err.name, err.message)

            if (
                err.name === 'NotAllowedError' ||
                err.name === 'PermissionDeniedError' ||
                err.message?.includes('denied')
            ) {
                if (onErrorRef.current) {
                    onErrorRef.current(
                        'Microphone access denied. Click the lock icon (🔒) in your browser address bar, set Microphone to "Allow", then refresh the page and try again.'
                    )
                }
            } else if (err.name === 'NotFoundError') {
                if (onErrorRef.current) {
                    onErrorRef.current(
                        'No microphone found. Please connect a microphone and try again.'
                    )
                }
            } else {
                if (onErrorRef.current) {
                    onErrorRef.current(`Microphone error: ${err.message || 'Unknown error'}`)
                }
            }
            return false
        } finally {
            // Always clean up the media stream
            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
            }
        }
    }, []) // No dependencies - uses refs

    const startListening = useCallback(async () => {
        if (!isSupported) {
            if (onErrorRef.current) {
                onErrorRef.current('Speech recognition is not supported in this browser.')
            }
            return
        }

        // Prevent starting if already listening or in the process of starting
        if (isListening || isStartingRef.current) {
            devLog('Already listening or starting, ignoring duplicate start request')
            return
        }

        // Check if site is using HTTPS (required for microphone access)
        if (
            typeof window !== 'undefined' &&
            window.location.protocol !== 'https:' &&
            window.location.hostname !== 'localhost'
        ) {
            if (onErrorRef.current) {
                onErrorRef.current(
                    'Microphone access requires HTTPS. Please use a secure connection.'
                )
            }
            return
        }

        if (recognitionRef.current) {
            isStartingRef.current = true

            if (mountedRef.current) {
                setTranscript('')
            }

            // Check and request microphone permission first
            const hasPermission = await checkMicrophonePermission()
            if (!hasPermission) {
                isStartingRef.current = false
                return // Error already shown by checkMicrophonePermission
            }

            try {
                // Now start speech recognition with permission already granted
                devLog('Starting speech recognition...')
                recognitionRef.current.start()

                // Play start beep (higher frequency)
                playBeep(800, 0.1)

                // Only update state if still mounted
                if (mountedRef.current) {
                    setIsListening(true)
                }
            } catch (error: unknown) {
                const err = error as { message?: string; name?: string }
                console.error('Failed to start speech recognition:', err)

                // Handle specific error cases
                if (err.message?.includes('already started') || err.name === 'InvalidStateError') {
                    // Recognition already running, just update state
                    devLog('Recognition already started, updating state')
                    if (mountedRef.current) {
                        setIsListening(true)
                    }
                } else {
                    if (mountedRef.current) {
                        setIsListening(false)
                    }
                    if (onErrorRef.current) {
                        onErrorRef.current('Failed to start voice input. Please try again.')
                    }
                }
            } finally {
                isStartingRef.current = false
            }
        }
    }, [isSupported, isListening, checkMicrophonePermission, playBeep])

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop()

            // Play stop beep (lower frequency)
            playBeep(400, 0.1)

            if (mountedRef.current) {
                setIsListening(false)
            }
        }
    }, [isListening, playBeep])

    const resetTranscript = useCallback(() => {
        if (mountedRef.current) {
            setTranscript('')
        }
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
