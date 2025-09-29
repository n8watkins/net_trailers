import React, { useState } from 'react'
import { testFirestoreFlow } from '../utils/testFirestoreFlow'
import { useDebugSettings } from './DebugControls'

export default function FirestoreTestButton() {
    const debugSettings = useDebugSettings()
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<boolean | null>(null)

    const runTest = async () => {
        setTesting(true)
        setTestResult(null)
        console.log('Starting Firestore test...')

        try {
            const result = await testFirestoreFlow()
            setTestResult(result)
        } catch (error) {
            console.error('Test error:', error)
            setTestResult(false)
        } finally {
            setTesting(false)
        }
    }

    // Only show in development and if Console debug is enabled
    if (process.env.NODE_ENV !== 'development' || !debugSettings.showFirebaseDebug) return null

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={runTest}
                disabled={testing}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    testing
                        ? 'bg-yellow-500 text-white animate-pulse'
                        : testResult === true
                          ? 'bg-green-500 text-white'
                          : testResult === false
                            ? 'bg-red-500 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
                {testing
                    ? '🧪 Testing...'
                    : testResult === true
                      ? '✅ Test Passed!'
                      : testResult === false
                        ? '❌ Test Failed'
                        : '🧪 Test Firestore'}
            </button>
            <div className="mt-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                Check console for details
            </div>
        </div>
    )
}
