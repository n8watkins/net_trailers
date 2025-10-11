import { useState, useEffect } from 'react'
import useAuth from '../hooks/useAuth'
import { useListsReadOnly } from '../hooks/useListsReadOnly'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useSessionStore } from '../stores/sessionStore'
import { useSessionManager } from '../hooks/useSessionManager'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { UserList } from '../types/userLists'
import {
    testFirestoreConnection,
    checkFirestoreProvisioning,
} from '../utils/testFirebaseConnection'
import { useDebugSettings } from './DebugControls'

export default function AuthFlowDebugger() {
    const debugSettings = useDebugSettings()
    const { user } = useAuth()
    const { getAllLists } = useListsReadOnly()
    const { isGuest, isAuthenticated, sessionType } = useAuthStatus()
    const activeSessionId = useSessionStore((state) => state.activeSessionId)
    const sessionManager = useSessionManager()

    const [authSteps, setAuthSteps] = useState<
        {
            step: string
            status: 'pending' | 'success' | 'error'
            details?: any
        }[]
    >([])

    const [directFirebaseUser, setDirectFirebaseUser] = useState<any>(null)
    const [firestoreStatus, setFirestoreStatus] = useState<any>(null)
    const [isTestingFirestore, setIsTestingFirestore] = useState(false)

    // Get watchlists
    const allLists = getAllLists()

    // Direct Firebase listener to bypass any hooks
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setDirectFirebaseUser(firebaseUser)
        })
        return unsubscribe
    }, [])

    const runAuthFlowTest = () => {
        const steps = []

        // Step 1: Check Firebase Config
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✓ Set' : '✗ Missing',
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
                ? '✓ Set'
                : '✗ Missing',
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✓ Set' : '✗ Missing',
        }

        const configComplete = Object.values(firebaseConfig).every((v) => v.includes('✓'))
        steps.push({
            step: '1. Firebase Configuration',
            status: configComplete ? 'success' : 'error',
            details: firebaseConfig,
        })

        // Step 2: Direct Firebase Auth State
        steps.push({
            step: '2. Direct Firebase Auth',
            status: directFirebaseUser ? 'success' : 'error',
            details: directFirebaseUser
                ? {
                      uid: directFirebaseUser.uid,
                      email: directFirebaseUser.email,
                      emailVerified: directFirebaseUser.emailVerified,
                      provider: directFirebaseUser.providerData?.[0]?.providerId,
                  }
                : 'No user detected by Firebase directly',
        })

        // Step 3: useAuth Hook
        steps.push({
            step: '3. useAuth Hook',
            status: user ? 'success' : 'error',
            details: user
                ? {
                      uid: user.uid,
                      email: user.email,
                      matchesDirectFirebase: user.uid === directFirebaseUser?.uid,
                  }
                : 'No user from useAuth hook',
        })

        // Step 4: Session Manager State
        steps.push({
            step: '4. Session Manager',
            status: sessionManager.sessionType === 'authenticated' ? 'success' : 'error',
            details: {
                sessionType: sessionManager.sessionType,
                activeSessionId: sessionManager.activeSessionId,
                isInitialized: sessionManager.isSessionInitialized,
                isTransitioning: sessionManager.isTransitioning,
                isGuest: sessionManager.isGuest,
                isAuthenticated: sessionManager.isAuthenticated,
            },
        })

        // Step 5: UserData State
        steps.push({
            step: '5. UserData Hook',
            status: isAuthenticated ? 'success' : 'error',
            details: {
                sessionType: sessionType,
                isGuest: isGuest,
                isAuthenticated: isAuthenticated,
                activeSessionId: activeSessionId,
                hasUserSession: false, // We don't track userSession anymore
                userSessionIsGuest: isGuest,
            },
        })

        // Step 6: LocalStorage Check
        steps.push({
            step: '6. LocalStorage',
            status: 'pending',
            details: {
                guestId: localStorage.getItem('nettrailer_guest_id'),
                sessionType: localStorage.getItem('nettrailer_session_type'),
                hasFirebaseAuth: !!localStorage.getItem(
                    'firebase:authUser:' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY
                ),
            },
        })

        // Step 7: Session Mismatch Detection
        const hasSessionMismatch =
            (directFirebaseUser && sessionManager.sessionType !== 'authenticated') ||
            (!directFirebaseUser && sessionManager.sessionType === 'authenticated')

        steps.push({
            step: '7. Session Sync Check',
            status: hasSessionMismatch ? 'error' : 'success',
            details: {
                firebaseHasUser: !!directFirebaseUser,
                sessionIsAuth: sessionManager.sessionType === 'authenticated',
                mismatch: hasSessionMismatch
                    ? 'SESSION MISMATCH DETECTED!'
                    : 'Session properly synced',
            },
        })

        // Step 8: Firestore Connection Status (if available)
        if (firestoreStatus) {
            steps.push({
                step: '8. Firestore Database',
                status:
                    firestoreStatus.canRead && firestoreStatus.canWrite
                        ? 'success'
                        : firestoreStatus.canRead
                          ? 'pending'
                          : 'error',
                details: firestoreStatus.error
                    ? {
                          error: firestoreStatus.error,
                          configured: firestoreStatus.firestoreConfigured,
                          canRead: firestoreStatus.canRead,
                          canWrite: firestoreStatus.canWrite,
                          authUser: firestoreStatus.authUser?.email || 'No auth user',
                          summary: firestoreStatus.details?.summary || 'Testing...',
                      }
                    : {
                          configured: firestoreStatus.firestoreConfigured,
                          canRead: firestoreStatus.canRead,
                          canWrite: firestoreStatus.canWrite,
                          authUser: firestoreStatus.authUser?.email || 'No auth user',
                          summary: firestoreStatus.details?.summary || '✅ Firestore is working',
                      },
            })
        }

        setAuthSteps(steps)
    }

    const testFirestore = async () => {
        setIsTestingFirestore(true)
        try {
            // First check if Firestore is provisioned
            const provisionCheck = await checkFirestoreProvisioning()
            if (!provisionCheck.provisioned) {
                setFirestoreStatus({
                    firestoreConfigured: false,
                    canRead: false,
                    canWrite: false,
                    error: provisionCheck.error,
                    details: {
                        summary: '❌ Firestore not provisioned',
                        instructions: provisionCheck.instructions,
                    },
                })
            } else {
                // Run full connection test
                const status = await testFirestoreConnection()
                setFirestoreStatus(status)
            }
            runAuthFlowTest() // Re-run test to include Firestore status
        } catch (error) {
            console.error('Failed to test Firestore:', error)
        } finally {
            setIsTestingFirestore(false)
        }
    }

    const forceSessionRefresh = async () => {
        console.log('🔄 FORCING SESSION REFRESH...')

        if (directFirebaseUser) {
            console.log('🔄 Firebase user exists, forcing auth session...')
            await sessionManager.startAuthSession()
        } else {
            console.log('🔄 No Firebase user, forcing guest session...')
            await sessionManager.startGuestSession()
        }

        // Re-run test after refresh
        setTimeout(runAuthFlowTest, 500)
    }

    const clearAllAndRestart = () => {
        console.log('🧹 CLEARING ALL SESSION DATA...')
        sessionManager.clearAllSessions()
        localStorage.clear()
        window.location.reload()
    }

    // Auto-run test on mount and when Firebase user changes
    useEffect(() => {
        setTimeout(runAuthFlowTest, 1000)
        // Auto-test Firestore if user is authenticated
        if (directFirebaseUser && !firestoreStatus) {
            setTimeout(testFirestore, 1500)
        }
    }, [directFirebaseUser])

    // Only show in development and if Console debug is enabled
    if (process.env.NODE_ENV !== 'development' || !debugSettings.showFirebaseDebug) return null

    return (
        <div
            className="fixed bottom-4 right-4 z-[50] bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl"
            style={{ width: '500px', maxHeight: '600px' }}
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base flex items-center">
                    🔍 Auth Flow Debugger
                </h3>
                <button
                    onClick={runAuthFlowTest}
                    className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                    Re-test
                </button>
            </div>

            {/* Scrollable content area - vertical layout */}
            <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: '350px' }}>
                {/* Auth Steps Section */}
                <div className="space-y-3 mb-4">
                    {authSteps.map((step, idx) => (
                        <div key={idx} className="border-l-2 border-gray-700 pl-3">
                            <div className="flex items-center space-x-2 mb-1">
                                <span
                                    className={`text-lg ${
                                        step.status === 'success'
                                            ? 'text-green-400'
                                            : step.status === 'error'
                                              ? 'text-red-400'
                                              : 'text-yellow-400'
                                    }`}
                                >
                                    {step.status === 'success'
                                        ? '✓'
                                        : step.status === 'error'
                                          ? '✗'
                                          : '⋯'}
                                </span>
                                <span className="text-gray-200 font-medium text-sm">
                                    {step.step}
                                </span>
                            </div>
                            {step.details && (
                                <pre className="text-xs text-gray-400 ml-6 mt-1 overflow-x-auto whitespace-pre-wrap font-mono">
                                    {JSON.stringify(step.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>

                {/* Firestore Setup Instructions (if needed) */}
                {firestoreStatus &&
                    firestoreStatus.error &&
                    firestoreStatus.details?.instructions && (
                        <div className="border border-yellow-600 bg-yellow-900/20 rounded p-3 mb-4">
                            <h4 className="text-yellow-400 font-semibold text-sm mb-2">
                                ⚠️ Firestore Setup Required
                            </h4>
                            <div className="text-xs text-gray-300 space-y-1">
                                {firestoreStatus.details.instructions.map(
                                    (instruction: string, idx: number) => (
                                        <div key={idx}>{instruction}</div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                {/* Watchlists Section */}
                <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-white font-semibold text-sm mb-3 flex items-center">
                        📋 Current Watchlists
                        <span className="ml-2 text-xs text-gray-400">
                            ({allLists.length} lists)
                        </span>
                    </h4>
                    <div className="space-y-2">
                        {allLists.length === 0 ? (
                            <div className="text-gray-400 text-xs">No watchlists found</div>
                        ) : (
                            allLists.map((list) => (
                                <div
                                    key={list.id}
                                    className="flex items-center justify-between bg-gray-800 rounded px-3 py-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        {list.emoji && (
                                            <span className="text-lg">{list.emoji}</span>
                                        )}
                                        <span className="text-gray-200 text-sm font-medium">
                                            {list.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-xs">
                                        <span className="text-gray-400">
                                            {list.items.length} items
                                        </span>
                                        {list.color && (
                                            <div
                                                className="w-3 h-3 rounded-full border border-gray-600"
                                                style={{ backgroundColor: list.color }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {/* Watchlist Summary */}
                    <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                        <div>
                            Total items across all lists:{' '}
                            {allLists.reduce((sum, list) => sum + list.items.length, 0)}
                        </div>
                        <div>Total lists: {allLists.length}</div>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                <button
                    onClick={testFirestore}
                    disabled={isTestingFirestore}
                    className="flex-1 text-sm px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-medium"
                >
                    {isTestingFirestore ? '⏳ Testing...' : '🔥 Test Firestore'}
                </button>
                <button
                    onClick={forceSessionRefresh}
                    className="flex-1 text-sm px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
                >
                    🔄 Force Refresh
                </button>
                <button
                    onClick={clearAllAndRestart}
                    className="flex-1 text-sm px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                >
                    🧹 Clear & Restart
                </button>
            </div>

            {/* Quick status summary */}
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 space-y-1">
                <div>
                    Firebase:{' '}
                    <span className="text-white">
                        {directFirebaseUser?.email || 'Not logged in'}
                    </span>
                </div>
                <div>
                    Session: <span className="text-white">{sessionManager.sessionType}</span> (
                    {sessionManager.activeSessionId?.substring(0, 8)}...)
                </div>
                <div>
                    Status:{' '}
                    <span className={sessionManager.isGuest ? 'text-yellow-400' : 'text-green-400'}>
                        {sessionManager.isGuest ? 'Guest Mode' : 'Authenticated'}
                    </span>
                </div>
            </div>
        </div>
    )
}
