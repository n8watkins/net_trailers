#!/usr/bin/env tsx

/**
 * Test Script: Weekly Trending Digest
 *
 * Tests the weekly digest cron job locally by calling the API endpoint
 * with proper authentication.
 *
 * Usage:
 *   npm run test:weekly-digest
 *   npm run test:weekly-digest -- --demo  # Demo mode (always finds new items)
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const CRON_SECRET = process.env.CRON_SECRET
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Parse command line arguments
const args = process.argv.slice(2)
const isDemoMode = args.includes('--demo')

async function testWeeklyDigest() {
    if (!CRON_SECRET) {
        console.error('❌ Missing CRON_SECRET in .env.local')
        process.exit(1)
    }

    console.log('\n📧 Testing Weekly Trending Digest Cron Job')
    console.log('==========================================\n')
    console.log(`🌐 Target: ${BASE_URL}/api/cron/update-trending`)
    console.log(`🔐 Auth: Using CRON_SECRET`)
    if (isDemoMode) {
        console.log('🎭 Mode: DEMO (will always find new items)')
    } else {
        console.log('📊 Mode: PRODUCTION (real comparison)')
    }
    console.log()

    try {
        const url = isDemoMode
            ? `${BASE_URL}/api/cron/update-trending?demo=true`
            : `${BASE_URL}/api/cron/update-trending`

        console.log('⏳ Calling cron endpoint...\n')

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${CRON_SECRET}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('❌ Request failed:')
            console.error(`   Status: ${response.status}`)
            console.error(`   Error: ${data.error || 'Unknown error'}`)
            if (data.details) {
                console.error(`   Details: ${data.details}`)
            }
            process.exit(1)
        }

        console.log('✅ Cron job completed successfully!\n')
        console.log('📊 Results:')
        console.log('─────────────────────────────────────')
        console.log(`   New Trending Items: ${data.newItems}`)
        console.log(`   Notifications Created: ${data.notifications}`)
        console.log(`   📧 Emails Sent: ${data.emailsSent || 0}`)
        if (data.demoMode) {
            console.log(`   🎭 Demo Mode: ${data.demoMode}`)
        }
        console.log()

        if (data.newItems === 0) {
            console.log('ℹ️  No new trending items found since last run')
            console.log('   Try running with --demo flag to test email sending')
        } else if (data.emailsSent === 0) {
            console.log('ℹ️  No emails sent. Possible reasons:')
            console.log('   - Users have not opted into email notifications')
            console.log('   - No users have matching watchlist items')
            console.log('   - RESEND_API_KEY not configured')
        }

        console.log('\n🎉 Test completed successfully!')
        process.exit(0)
    } catch (error) {
        console.error('\n❌ Test failed:', error)
        if (error instanceof Error) {
            console.error(`   ${error.message}`)
        }
        process.exit(1)
    }
}

// Run the test
testWeeklyDigest()
