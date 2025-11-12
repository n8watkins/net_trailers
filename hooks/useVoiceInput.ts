'use client'

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { voiceInputManager } from '../lib/voiceInputManager'

interface UseVoiceInputOptions {
    onResult: (transcript: string) => void
    onError?: (error: string) => void
    language?: string
    continuous?: boolean
    /** Optional stable identifier for logging/debugging */
    sourceId?: string
}

interface UseVoiceInputReturn {
    isListening: boolean
    isSupported: boolean
    transcript: string
    startListening: () => Promise<void>
    stopListening: () => void
    resetTranscript: () => void
    isBusy: boolean
}

export function useVoiceInput({
    onResult,
    onError,
    language = 'en-US',
    continuous = false,
    sourceId,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const generatedId = useId()
    const resolvedSourceId = sourceId ?? generatedId

    const onResultRef = useRef(onResult)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onResultRef.current = onResult
    }, [onResult])

    useEffect(() => {
        onErrorRef.current = onError
    }, [onError])

    const subscribe = useCallback(
        (listener: (state: ReturnType<typeof voiceInputManager.getState>) => void) =>
            voiceInputManager.subscribe(listener),
        []
    )

    const getSnapshot = useCallback(() => voiceInputManager.getState(), [])

    const {
        isSupported,
        isListening: globalListening,
        transcript,
        activeSourceId,
    } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    const isActiveSource = globalListening && activeSourceId === resolvedSourceId
    const isBusy = globalListening && activeSourceId !== resolvedSourceId

    const handleStart = useCallback(async () => {
        await voiceInputManager.startListening(
            resolvedSourceId,
            {
                onResult: (text) => onResultRef.current?.(text),
                onError: (error) => onErrorRef.current?.(error),
            },
            {
                language,
                continuous,
            }
        )
    }, [resolvedSourceId, language, continuous])

    const handleStop = useCallback(() => {
        void voiceInputManager.stopListening(resolvedSourceId)
    }, [resolvedSourceId])

    const handleReset = useCallback(() => {
        voiceInputManager.resetTranscript(resolvedSourceId)
    }, [resolvedSourceId])

    return {
        isListening: isActiveSource,
        isSupported,
        transcript: isActiveSource ? transcript : '',
        startListening: handleStart,
        stopListening: handleStop,
        resetTranscript: handleReset,
        isBusy,
    }
}
