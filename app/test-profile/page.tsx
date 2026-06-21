'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import type { PublicProfilePayload } from '@/lib/publicProfile'

/**
 * Test Profile Page
 *
 * Debug page that exercises the Turso-backed profile API routes.
 * All data is fetched via fetch() — no direct Firestore reads.
 */

export default function TestProfilePage() {
    const [results, setResults] = useState<Record<string, unknown>>({})
    const [loading, setLoading] = useState(true)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    useEffect(() => {
        async function runTests() {
            const testResults: Record<string, unknown> = {}

            testResults.userId = userId
            testResults.userIdExists = !!userId

            if (!userId) {
                setResults(testResults)
                setLoading(false)
                return
            }

            // Test 1: /api/profiles/[userId] — basic profile row
            try {
                const res = await fetch(`/api/profiles/${userId}`)
                testResults.profileStatus = res.status
                const json = await res.json()
                testResults.profileData = json.profile ?? null
                testResults.profileError = json.error ?? null
            } catch (err) {
                testResults.profileError = (err as Error).message
            }

            // Test 2: /api/public-profile/[userId] — full aggregated payload
            try {
                const res = await fetch(`/api/public-profile/${userId}`)
                testResults.publicProfileStatus = res.status
                const json = (await res.json()) as PublicProfilePayload
                testResults.publicProfileData = {
                    displayName: json.profile?.displayName,
                    rankingsCount: json.rankings?.length ?? 0,
                    likedCount: json.likedContent?.length ?? 0,
                    collectionsCount: json.collections?.length ?? 0,
                    threadsCount: json.forum?.threads?.length ?? 0,
                    pollsCount: json.forum?.pollsCreated?.length ?? 0,
                    visibility: json.visibility,
                    stats: json.stats,
                }
            } catch (err) {
                testResults.publicProfileError = (err as Error).message
            }

            // Test 3: /api/rankings?scope=mine — own rankings (requires auth)
            try {
                const res = await fetch('/api/rankings?scope=mine', { credentials: 'same-origin' })
                testResults.rankingsStatus = res.status
                const json = await res.json()
                testResults.rankingsCount = json.data?.length ?? 0
                testResults.rankingsError = json.error ?? null
            } catch (err) {
                testResults.rankingsError = (err as Error).message
            }

            // Test 4: /api/polls/user/[userId] — created polls
            try {
                const res = await fetch(`/api/polls/user/${userId}`)
                testResults.pollsStatus = res.status
                const json = await res.json()
                testResults.pollsCount = json.polls?.length ?? 0
                testResults.pollsError = json.error ?? null
            } catch (err) {
                testResults.pollsError = (err as Error).message
            }

            setResults(testResults)
            setLoading(false)
        }

        runTests()
    }, [userId])

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <h1 className="text-3xl font-bold mb-4">Testing API Profile Routes...</h1>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-6">API Profile Test Results (Turso-backed)</h1>

            <div className="space-y-6">
                {/* User ID */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-blue-400">Current User ID</h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            { userId: results.userId, exists: results.userIdExists },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* /api/profiles/[userId] */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-green-400">
                        /api/profiles/{String(results.userId)} (status:{' '}
                        {String(results.profileStatus)})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            { data: results.profileData, error: results.profileError },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* /api/public-profile/[userId] */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-yellow-400">
                        /api/public-profile/{String(results.userId)} (status:{' '}
                        {String(results.publicProfileStatus)})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(
                            results.publicProfileData ?? results.publicProfileError,
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* /api/rankings?scope=mine */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-purple-400">
                        /api/rankings?scope=mine (status: {String(results.rankingsStatus)})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            { count: results.rankingsCount, error: results.rankingsError },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* /api/polls/user/[userId] */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-pink-400">
                        /api/polls/user/{String(results.userId)} (status:{' '}
                        {String(results.pollsStatus)})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            { count: results.pollsCount, error: results.pollsError },
                            null,
                            2
                        )}
                    </pre>
                </div>
            </div>
        </div>
    )
}
