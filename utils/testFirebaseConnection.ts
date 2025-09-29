import { db, auth } from '../firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function testFirestoreConnection() {
    const results = {
        authConfigured: false,
        authUser: null as any,
        firestoreConfigured: false,
        canRead: false,
        canWrite: false,
        error: null as string | null,
        details: {} as any,
    }

    try {
        // Test 1: Check if auth is configured
        results.authConfigured = auth !== null && auth !== undefined
        results.authUser = auth.currentUser
            ? {
                  uid: auth.currentUser.uid,
                  email: auth.currentUser.email,
              }
            : null

        // Test 2: Check if Firestore is configured
        results.firestoreConfigured = db !== null && db !== undefined

        if (!results.firestoreConfigured) {
            results.error = 'Firestore is not initialized'
            return results
        }

        // Test 3: Try to read a test document
        const testDocRef = doc(db, 'system', 'test')
        try {
            const testDoc = await getDoc(testDocRef)
            results.canRead = true
            results.details.testDocExists = testDoc.exists()
            results.details.testDocData = testDoc.exists() ? testDoc.data() : null
        } catch (readError: any) {
            results.canRead = false
            results.details.readError = readError.message

            // Check if it's a permissions error or missing configuration
            if (readError.code === 'permission-denied') {
                results.error =
                    'Firestore rules deny read access. Check your Firestore security rules.'
            } else if (readError.code === 'unavailable') {
                results.error =
                    'Firestore is unavailable. Check if Firestore is enabled in Firebase Console.'
            } else if (
                readError.message?.includes('Failed to get document because the client is offline')
            ) {
                results.error = 'Client is offline. Check your internet connection.'
            } else if (readError.message?.includes('Could not reach Cloud Firestore backend')) {
                results.error =
                    'Cannot reach Firestore. It may not be provisioned yet in Firebase Console.'
            } else {
                results.error = `Read error: ${readError.message}`
            }
        }

        // Test 4: Try to write to a test document (only if user is authenticated)
        if (results.authUser) {
            const userTestDocRef = doc(db, 'users', `${results.authUser.uid}_test`)
            try {
                await setDoc(
                    userTestDocRef,
                    {
                        test: true,
                        timestamp: serverTimestamp(),
                        email: results.authUser.email,
                    },
                    { merge: true }
                )
                results.canWrite = true
                results.details.writeSuccess = true
            } catch (writeError: any) {
                results.canWrite = false
                results.details.writeError = writeError.message

                if (!results.error) {
                    if (writeError.code === 'permission-denied') {
                        results.error =
                            'Firestore rules deny write access. Check your Firestore security rules.'
                    } else if (writeError.code === 'unavailable') {
                        results.error = 'Firestore is unavailable for writes.'
                    } else {
                        results.error = `Write error: ${writeError.message}`
                    }
                }
            }
        } else {
            results.details.writeSkipped = 'No authenticated user'
        }

        // Provide summary
        if (!results.error) {
            if (results.canRead && results.canWrite) {
                results.details.summary = '✅ Firestore is fully configured and accessible'
            } else if (results.canRead) {
                results.details.summary =
                    '⚠️ Firestore can read but not write (check auth or rules)'
            } else {
                results.details.summary = '❌ Firestore cannot be accessed (check Firebase Console)'
            }
        }
    } catch (error: any) {
        results.error = `Unexpected error: ${error.message}`
    }

    return results
}

// Helper function to check if Firestore needs to be provisioned
export async function checkFirestoreProvisioning() {
    try {
        // Try to access Firestore
        const testRef = doc(db, 'system', 'health_check')
        await getDoc(testRef)
        return { provisioned: true, error: null }
    } catch (error: any) {
        if (error.message?.includes('Could not reach Cloud Firestore backend')) {
            return {
                provisioned: false,
                error: 'Firestore is not provisioned. Please go to Firebase Console and enable Firestore Database.',
                instructions: [
                    '1. Go to https://console.firebase.google.com',
                    '2. Select your project',
                    '3. Click on "Firestore Database" in the left menu',
                    '4. Click "Create database"',
                    '5. Choose "Start in test mode" for development',
                    '6. Select a location close to you',
                    '7. Click "Enable"',
                ],
            }
        }
        return { provisioned: true, error: error.message }
    }
}
