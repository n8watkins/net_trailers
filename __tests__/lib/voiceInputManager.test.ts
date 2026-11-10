/**
 * Voice search is feature-detected: no SpeechRecognition (or a browser that
 * reports it has no speech service) means no mic, not an error.
 */

type Win = Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }

class FakeRecognition {
    static last: FakeRecognition | null = null
    continuous = false
    interimResults = false
    lang = ''
    onresult: ((event: unknown) => void) | null = null
    onerror: ((event: { error: string; message: string }) => void) | null = null
    onend: (() => void) | null = null
    onstart: (() => void) | null = null
    constructor() {
        FakeRecognition.last = this
    }
    start() {
        this.onstart?.()
    }
    stop() {
        this.onend?.()
    }
    abort() {
        this.onend?.()
    }
    addEventListener() {}
    removeEventListener() {}
}

function loadManager() {
    let manager: typeof import('../../lib/voiceInputManager').voiceInputManager
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        manager = require('../../lib/voiceInputManager').voiceInputManager
    })
    return manager!
}

afterEach(() => {
    delete (window as Win).SpeechRecognition
    delete (window as Win).webkitSpeechRecognition
    window.sessionStorage.clear()
})

describe('voice input feature detection', () => {
    it('is unsupported (no mic) when the browser lacks SpeechRecognition', () => {
        expect(loadManager().getState().isSupported).toBe(false)
    })

    it('is supported when the API exists', () => {
        ;(window as Win).webkitSpeechRecognition = FakeRecognition
        expect(loadManager().getState().isSupported).toBe(true)
    })

    it('hides the mic, without an error, when the browser has no speech service', () => {
        ;(window as Win).webkitSpeechRecognition = FakeRecognition
        const manager = loadManager()
        const onError = jest.fn()
        // Simulate the "network" error Chromium builds without a speech service raise
        manager['activeSession'] = { sourceId: 's', callbacks: { onError }, options: {} } as never
        FakeRecognition.last!.onerror!({ error: 'network', message: '' })

        expect(manager.getState().isSupported).toBe(false)
        expect(onError).not.toHaveBeenCalled()
        // ...and stays hidden on the next page load in this tab
        expect(loadManager().getState().isSupported).toBe(false)
    })
})
