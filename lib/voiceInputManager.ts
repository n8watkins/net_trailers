'use client'

import { devLog } from '../utils/debugLogger'

// TypeScript declarations for the Web Speech API
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
        webkitAudioContext?: typeof AudioContext
    }
}

export interface VoiceInputState {
    isSupported: boolean
    isListening: boolean
    activeSourceId: string | null
    transcript: string
    lastError?: string
}

interface VoiceSessionCallbacks {
    onResult?: (transcript: string) => void
    onError?: (message: string) => void
}

interface VoiceSessionOptions {
    language: string
    continuous: boolean
}

type VoiceListener = (state: VoiceInputState) => void

class VoiceInputManager {
    private listeners = new Set<VoiceListener>()
    private state: VoiceInputState = {
        isSupported: false,
        isListening: false,
        activeSourceId: null,
        transcript: '',
    }

    private recognition: SpeechRecognition | null = null
    private audioContext: AudioContext | null = null
    private activeSession: {
        sourceId: string
        callbacks: VoiceSessionCallbacks
        options: VoiceSessionOptions
    } | null = null

    private pendingOnEndResolvers: Array<() => void> = []
    private isStarting = false

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializeSpeechRecognition()
            this.initializeAudioContext()
        }
    }

    subscribe(listener: VoiceListener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getState(): VoiceInputState {
        return this.state
    }

    async startListening(
        sourceId: string,
        callbacks: VoiceSessionCallbacks,
        options: VoiceSessionOptions
    ): Promise<boolean> {
        if (typeof window === 'undefined') {
            callbacks.onError?.('Speech recognition is only available in the browser.')
            return false
        }

        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            callbacks.onError?.('Microphone access requires HTTPS. Please use a secure connection.')
            return false
        }

        if (!this.recognition) {
            this.initializeSpeechRecognition()
        }

        if (!this.recognition || !this.state.isSupported) {
            callbacks.onError?.('Speech recognition is not supported in this browser.')
            return false
        }

        if (this.isStarting) {
            devLog('🎙️ VoiceInput: start ignored (already starting)')
            return false
        }

        if (this.state.isListening && this.activeSession) {
            // Interrupt the existing session before starting a new one
            devLog(`🎙️ VoiceInput: preempting ${this.activeSession.sourceId} for ${sourceId}`)
            await this.stopCurrentSession({
                message: 'Voice input switched to another control.',
                notify: false,
                playSound: false,
            })
        }

        this.isStarting = true
        this.activeSession = {
            sourceId,
            callbacks,
            options,
        }

        this.recognition.lang = options.language
        this.recognition.continuous = options.continuous
        this.recognition.interimResults = true

        this.setState({
            transcript: '',
            activeSourceId: sourceId,
            lastError: undefined,
        })

        const hasPermission = await this.checkMicrophonePermission(callbacks)
        if (!hasPermission) {
            this.isStarting = false
            this.activeSession = null
            this.setState({ isListening: false, activeSourceId: null })
            return false
        }

        try {
            this.recognition.start()
            this.playBeep(800, 0.1)
            this.setState({ isListening: true })
            devLog(`🎙️ VoiceInput: started by ${sourceId}`)
            return true
        } catch (error) {
            const err = error as { message?: string; name?: string }
            if (err.name === 'InvalidStateError' || err.message?.includes('already started')) {
                devLog('🎙️ VoiceInput: recognition already started, syncing state')
                this.setState({ isListening: true })
                return true
            }

            callbacks.onError?.('Failed to start voice input. Please try again.')
            this.setState({ isListening: false, activeSourceId: null, lastError: err.message })
            return false
        } finally {
            this.isStarting = false
        }
    }

    async stopListening(sourceId: string) {
        if (!this.recognition) return
        if (!this.state.isListening) return
        if (this.activeSession?.sourceId && this.activeSession.sourceId !== sourceId) {
            devLog(
                `🎙️ VoiceInput: stop ignored for ${sourceId} (session owned by ${this.activeSession.sourceId})`
            )
            return
        }

        await this.stopCurrentSession()
    }

    resetTranscript(sourceId: string) {
        if (this.activeSession?.sourceId === sourceId) {
            this.setState({ transcript: '' })
        }
    }

    private initializeSpeechRecognition() {
        if (this.recognition || typeof window === 'undefined') return

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        this.state.isSupported = Boolean(SpeechRecognition)

        if (!SpeechRecognition) {
            devLog('🎙️ VoiceInput: SpeechRecognition unavailable')
            return
        }

        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = true
        this.recognition.lang = 'en-US'

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
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

            const currentTranscript = (finalTranscript || interimTranscript).trim()
            if (currentTranscript) {
                this.setState({ transcript: currentTranscript })
            }

            if (finalTranscript && this.activeSession?.callbacks.onResult) {
                this.activeSession.callbacks.onResult(finalTranscript.trim())
                if (!this.activeSession.options.continuous) {
                    this.stopCurrentSession()
                }
            }
        }

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            const errorMessage =
                event.error === 'no-speech'
                    ? 'No speech detected. Please try again.'
                    : event.error === 'not-allowed'
                      ? 'Microphone access denied. Please enable microphone permissions.'
                      : 'Speech recognition error. Please try again.'

            this.activeSession?.callbacks.onError?.(errorMessage)
            this.setState({ lastError: errorMessage })
            this.stopCurrentSession()
        }

        this.recognition.onend = () => {
            this.setState({ isListening: false, activeSourceId: null, transcript: '' })
            this.activeSession = null
            this.flushPendingResolvers()
            devLog('🎙️ VoiceInput: recognition ended')
        }
    }

    private initializeAudioContext() {
        if (this.audioContext || typeof window === 'undefined') return

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext
        if (!AudioContextCtor) return

        try {
            this.audioContext = new AudioContextCtor()
        } catch (error) {
            console.error('Failed to create AudioContext for voice input:', error)
        }
    }

    private playBeep(frequency: number, duration: number) {
        if (!this.audioContext) return

        try {
            const oscillator = this.audioContext.createOscillator()
            const gainNode = this.audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(this.audioContext.destination)

            oscillator.frequency.value = frequency
            oscillator.type = 'sine'

            const currentTime = this.audioContext.currentTime
            gainNode.gain.setValueAtTime(0, currentTime)
            gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.01)
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration)

            oscillator.start(currentTime)
            oscillator.stop(currentTime + duration)
        } catch (error) {
            console.error('VoiceInput beep error:', error)
        }
    }

    private async stopCurrentSession(options?: {
        message?: string
        notify?: boolean
        playSound?: boolean
        immediateState?: boolean
    }) {
        if (!this.recognition) return

        const {
            message,
            notify = Boolean(message),
            playSound = true,
            immediateState = true,
        } = options ?? {}
        const previousSession = this.activeSession
        const wasListening = this.state.isListening

        if (message && notify && previousSession?.callbacks.onError) {
            previousSession.callbacks.onError(message)
        }

        if (immediateState && wasListening) {
            this.setState({ isListening: false, activeSourceId: null, transcript: '' })
        }

        if (!wasListening) {
            this.activeSession = null
            this.setState({ isListening: false, activeSourceId: null, transcript: '' })
            return
        }

        await new Promise<void>((resolve) => {
            this.pendingOnEndResolvers.push(resolve)
            try {
                this.recognition?.stop()
                if (playSound) {
                    this.playBeep(400, 0.1)
                }
            } catch (error) {
                console.warn('VoiceInput stop error:', error)
                resolve()
            }
        })
    }

    private flushPendingResolvers() {
        if (this.pendingOnEndResolvers.length === 0) return
        this.pendingOnEndResolvers.forEach((resolve) => resolve())
        this.pendingOnEndResolvers = []
    }

    private async checkMicrophonePermission(callbacks: VoiceSessionCallbacks) {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            callbacks.onError?.('Your browser does not support microphone access.')
            return false
        }

        let stream: MediaStream | null = null

        try {
            devLog('🎙️ VoiceInput: requesting microphone permission')
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            return true
        } catch (error) {
            const err = error as { name?: string; message?: string }
            if (
                err.name === 'NotAllowedError' ||
                err.name === 'PermissionDeniedError' ||
                err.message?.includes('denied')
            ) {
                callbacks.onError?.(
                    'Microphone access denied. Click the lock icon (🔒) in your browser address bar, allow the microphone, then refresh the page.'
                )
            } else if (err.name === 'NotFoundError') {
                callbacks.onError?.('No microphone found. Please connect one and try again.')
            } else {
                callbacks.onError?.(`Microphone error: ${err.message || 'Unknown error'}`)
            }
            return false
        } finally {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
            }
        }
    }

    private setState(partial: Partial<VoiceInputState>) {
        this.state = {
            ...this.state,
            ...partial,
        }
        this.listeners.forEach((listener) => listener(this.state))
    }
}

export const voiceInputManager = new VoiceInputManager()
