/**
 * Seed Demo Profiles Script
 *
 * Creates demo user profiles with rankings, threads, and polls
 * to populate the community page with realistic content.
 *
 * Usage:
 *   npx ts-node scripts/seedDemoProfiles.ts
 *   npx ts-node scripts/seedDemoProfiles.ts --count=5 --rankings=3 --threads=2 --polls=1
 */

// Load environment variables
import './load-env'

import { seedDemoProfiles, getDemoProfileIds } from '../utils/seed'

// Parse command line arguments
function parseArgs(): {
    count: number
    rankings: number
    threads: number
    polls: number
} {
    const args = process.argv.slice(2)
    const options = {
        count: 3,
        rankings: 2,
        threads: 2,
        polls: 1,
    }

    for (const arg of args) {
        const [key, value] = arg.replace('--', '').split('=')
        if (key === 'count') options.count = parseInt(value, 10)
        if (key === 'rankings') options.rankings = parseInt(value, 10)
        if (key === 'threads') options.threads = parseInt(value, 10)
        if (key === 'polls') options.polls = parseInt(value, 10)
    }

    return options
}

async function main() {
    console.log('='.repeat(60))
    console.log('🌱 Demo Profile Seeder')
    console.log('='.repeat(60))

    const options = parseArgs()

    console.log('\nConfiguration:')
    console.log(`  Profiles to create: ${options.count}`)
    console.log(`  Rankings per profile: ${options.rankings}`)
    console.log(`  Threads per profile: ${options.threads}`)
    console.log(`  Polls per profile: ${options.polls}`)
    console.log('')

    // Check for existing demo profiles
    console.log('📋 Checking for existing demo profiles...')
    const existingIds = await getDemoProfileIds()
    if (existingIds.length > 0) {
        console.log(`  Found ${existingIds.length} existing demo profile(s)`)
        console.log('  Existing IDs:', existingIds)
    } else {
        console.log('  No existing demo profiles found')
    }

    console.log('')

    // Create demo profiles
    try {
        const createdIds = await seedDemoProfiles({
            count: options.count,
            withRankings: options.rankings > 0,
            withForumPosts: options.threads > 0 || options.polls > 0,
            rankingsPerProfile: options.rankings,
            threadsPerProfile: options.threads,
            pollsPerProfile: options.polls,
        })

        console.log('\n' + '='.repeat(60))
        console.log('✅ Seeding Complete!')
        console.log('='.repeat(60))
        console.log(`\nCreated ${createdIds.length} demo profile(s):`)
        createdIds.forEach((id, i) => {
            console.log(`  ${i + 1}. ${id}`)
        })

        console.log('\nThese profiles will now appear on:')
        console.log('  - Community page rankings')
        console.log('  - Forum threads list')
        console.log('  - Polls list')
        console.log('  - User profile pages (/users/[userId])')
    } catch (error) {
        console.error('\n❌ Seeding failed:', error)
        process.exit(1)
    }
}

// Run the script
main()
    .then(() => {
        console.log('\n👋 Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error)
        process.exit(1)
    })
