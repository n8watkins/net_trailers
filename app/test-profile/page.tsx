'use client'

import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { useSessionStore } from '../../stores/sessionStore'

export default function TestProfilePage() {
    const [results, setResults] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    useEffect(() => {
        async function runTests() {
            const testResults: any = {}

            try {
                // Test 1: Check if userId exists
                testResults.userId = userId
                testResults.userIdExists = !!userId

                if (!userId) {
                    setResults(testResults)
                    setLoading(false)
                    return
                }

                // Test 2: Check profiles collection
                try {
                    const profileRef = doc(db, 'profiles', userId)
                    const profileSnap = await getDoc(profileRef)
                    testResults.profileExists = profileSnap.exists()
                    testResults.profileData = profileSnap.exists() ? profileSnap.data() : null
                } catch (err) {
                    testResults.profileError = (err as Error).message
                }

                // Test 3: Check users collection
                try {
                    const userRef = doc(db, 'users', userId)
                    const userSnap = await getDoc(userRef)
                    testResults.userExists = userSnap.exists()
                    testResults.userData = userSnap.exists() ? userSnap.data() : null
                } catch (err) {
                    testResults.userError = (err as Error).message
                }

                // Test 4: Check rankings for this user
                try {
                    const rankingsRef = collection(db, 'rankings')
                    const rankingsQuery = query(
                        rankingsRef,
                        where('userId', '==', userId),
                        limit(5)
                    )
                    const rankingsSnap = await getDocs(rankingsQuery)
                    testResults.rankingsCount = rankingsSnap.size
                    testResults.rankings = rankingsSnap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                } catch (err) {
                    testResults.rankingsError = (err as Error).message
                }

                // Test 5: Check all profiles (to see if any exist)
                try {
                    const allProfilesRef = collection(db, 'profiles')
                    const allProfilesQuery = query(allProfilesRef, limit(5))
                    const allProfilesSnap = await getDocs(allProfilesQuery)
                    testResults.totalProfilesFound = allProfilesSnap.size
                    testResults.sampleProfiles = allProfilesSnap.docs.map((doc) => ({
                        id: doc.id,
                        data: doc.data(),
                    }))
                } catch (err) {
                    testResults.allProfilesError = (err as Error).message
                }

                // Test 6: Check all users (to see if any exist)
                try {
                    const allUsersRef = collection(db, 'users')
                    const allUsersQuery = query(allUsersRef, limit(5))
                    const allUsersSnap = await getDocs(allUsersQuery)
                    testResults.totalUsersFound = allUsersSnap.size
                    testResults.sampleUsers = allUsersSnap.docs.map((doc) => ({
                        id: doc.id,
                        data: doc.data(),
                    }))
                } catch (err) {
                    testResults.allUsersError = (err as Error).message
                }
            } catch (err) {
                testResults.generalError = (err as Error).message
            }

            setResults(testResults)
            setLoading(false)
        }

        runTests()
    }, [userId])

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <h1 className="text-3xl font-bold mb-4">Testing Firestore Profile Data...</h1>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Firestore Profile Test Results</h1>

            <div className="space-y-6">
                {/* User ID */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-blue-400">Current User ID</h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            {
                                userId: results.userId,
                                exists: results.userIdExists,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* Profiles Collection */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-green-400">
                        Profiles Collection (profiles/{results.userId})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            {
                                exists: results.profileExists,
                                data: results.profileData,
                                error: results.profileError,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* Users Collection */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-yellow-400">
                        Users Collection (users/{results.userId})
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm">
                        {JSON.stringify(
                            {
                                exists: results.userExists,
                                data: results.userData,
                                error: results.userError,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* Rankings */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-purple-400">
                        Rankings for User ({results.rankingsCount} found)
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(
                            {
                                count: results.rankingsCount,
                                rankings: results.rankings,
                                error: results.rankingsError,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* All Profiles Sample */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-pink-400">
                        Sample Profiles in Database ({results.totalProfilesFound} found)
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(
                            {
                                count: results.totalProfilesFound,
                                profiles: results.sampleProfiles,
                                error: results.allProfilesError,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* All Users Sample */}
                <div className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2 text-orange-400">
                        Sample Users in Database ({results.totalUsersFound} found)
                    </h2>
                    <pre className="bg-black p-3 rounded overflow-auto text-sm max-h-96">
                        {JSON.stringify(
                            {
                                count: results.totalUsersFound,
                                users: results.sampleUsers,
                                error: results.allUsersError,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>

                {/* General Errors */}
                {results.generalError && (
                    <div className="bg-red-900 rounded-lg p-4">
                        <h2 className="text-xl font-semibold mb-2">General Error</h2>
                        <pre className="bg-black p-3 rounded overflow-auto text-sm">
                            {results.generalError}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
