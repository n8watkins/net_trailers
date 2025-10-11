/**
 * Helper script to create a test user for manual browser testing
 *
 * This creates a test user account in Firebase Auth so you can:
 * 1. Log in via the browser
 * 2. Test authenticated user persistence (Firebase)
 * 3. Compare with guest mode persistence (localStorage)
 */

// IMPORTANT: Load environment variables FIRST, before any Firebase imports
import './load-env'

import { auth } from '../firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'

// Test user credentials (NOT for production!)
export const TEST_USER = {
    email: 'test@nettrailer.dev',
    password: 'TestPassword123!',
    displayName: 'Test User',
}

async function createTestUser() {
    console.log('\n' + '='.repeat(70))
    console.log('🔧 TEST USER CREATION SCRIPT')
    console.log('='.repeat(70))

    try {
        // Try to create the user
        console.log('\n📝 Creating test user...')
        console.log(`Email: ${TEST_USER.email}`)
        console.log(`Password: ${TEST_USER.password}`)

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            TEST_USER.email,
            TEST_USER.password
        )

        console.log('\n✅ Test user created successfully!')
        console.log(`User ID: ${userCredential.user.uid}`)
        console.log(`Email: ${userCredential.user.email}`)

        console.log('\n📋 SAVE THESE CREDENTIALS:')
        console.log('═'.repeat(70))
        console.log(`Email:    ${TEST_USER.email}`)
        console.log(`Password: ${TEST_USER.password}`)
        console.log('═'.repeat(70))

        console.log('\n🎯 Next steps:')
        console.log('1. Open http://localhost:3000 in your browser')
        console.log('2. Click "Sign In"')
        console.log('3. Use the credentials above to log in')
        console.log('4. Test creating watchlists and refreshing the page')

        return userCredential.user
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('\n⚠️  Test user already exists!')
            console.log('Attempting to sign in...')

            try {
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    TEST_USER.email,
                    TEST_USER.password
                )

                console.log('\n✅ Successfully signed in as test user!')
                console.log(`User ID: ${userCredential.user.uid}`)
                console.log(`Email: ${userCredential.user.email}`)

                console.log('\n📋 TEST USER CREDENTIALS:')
                console.log('═'.repeat(70))
                console.log(`Email:    ${TEST_USER.email}`)
                console.log(`Password: ${TEST_USER.password}`)
                console.log('═'.repeat(70))

                return userCredential.user
            } catch (signInError: any) {
                console.error('\n❌ Failed to sign in as existing user:', signInError.message)
                console.log('\nℹ️  If you forgot the password, you can:')
                console.log('1. Delete the user from Firebase Console')
                console.log('2. Run this script again')
                throw signInError
            }
        } else {
            console.error('\n❌ Failed to create test user:', error.message)
            throw error
        }
    }
}

async function verifyTestUser() {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 TEST USER VERIFICATION')
    console.log('='.repeat(70))

    try {
        console.log('\n📝 Attempting to sign in...')
        const userCredential = await signInWithEmailAndPassword(
            auth,
            TEST_USER.email,
            TEST_USER.password
        )

        console.log('✅ Test user credentials are valid!')
        console.log(`User ID: ${userCredential.user.uid}`)
        console.log(`Email: ${userCredential.user.email}`)

        return true
    } catch (error: any) {
        console.error('❌ Test user credentials are invalid:', error.message)
        return false
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2)
    const command = args[0] || 'create'

    if (command === 'verify') {
        await verifyTestUser()
    } else {
        await createTestUser()
    }

    process.exit(0)
}

// Run if executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('\n💥 Script failed:', error)
        process.exit(1)
    })
}

export { createTestUser, verifyTestUser }
