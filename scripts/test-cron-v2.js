#!/usr/bin/env node

/**
 * Test cron job v2 (ranking changes) locally
 * Usage: npm run test:cron:v2
 */

const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const CRON_SECRET = process.env.CRON_SECRET
const BASE_URL = process.argv[2] || 'http://localhost:3000'

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

function header(message) {
    log('========================================', colors.blue)
    log(`  ${message}`, colors.blue)
    log('========================================', colors.blue)
    console.log('')
}

async function testCronEndpoint() {
    header('Trending Cron V2 Testing (Ranking Changes)')

    if (!CRON_SECRET) {
        log('Error: CRON_SECRET not found in .env.local', colors.red)
        process.exit(1)
    }

    log(`Base URL: ${BASE_URL}`, colors.green)
    log(`CRON_SECRET: ${CRON_SECRET.substring(0, 10)}... (hidden)`, colors.green)
    console.log('')

    log('Testing /api/cron/update-trending-v2...', colors.blue)
    console.log('')

    const url = new URL('/api/cron/update-trending-v2', BASE_URL)
    const httpModule = url.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json',
            },
        }

        const req = httpModule.request(options, (res) => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            })

            res.on('end', () => {
                if (res.statusCode === 200) {
                    log(`✓ Success! (HTTP ${res.statusCode})`, colors.green)
                    console.log('')
                    const json = JSON.parse(data)

                    log('Response:', colors.blue)
                    log(`  Total ranking changes: ${json.totalChanges}`, colors.cyan)
                    log('  Change breakdown:', colors.cyan)
                    log(`    - New entries: ${json.changeBreakdown.new}`, colors.cyan)
                    log(`    - Big jumps: ${json.changeBreakdown.big_jump}`, colors.cyan)
                    log(`    - Entered top 10: ${json.changeBreakdown.entered_top_10}`, colors.cyan)
                    log(`    - Entered top 5: ${json.changeBreakdown.entered_top_5}`, colors.cyan)
                    log(`    - Reached #1: ${json.changeBreakdown.reached_number_1}`, colors.cyan)
                    log(`  Notifications created: ${json.notifications}`, colors.cyan)
                    log(`  Demo mode: ${json.demoMode ? 'YES' : 'NO'}`, colors.cyan)
                    console.log('')

                    if (json.totalChanges === 0) {
                        log('ℹ  No ranking changes detected', colors.yellow)
                        log(
                            '   This means the trending list is the same as last run',
                            colors.yellow
                        )
                        log('   Try again later when TMDB updates trending data', colors.yellow)
                    }
                } else {
                    log(`✗ Failed! (HTTP ${res.statusCode})`, colors.red)
                    console.log('')
                    log('Response:', colors.yellow)
                    console.log(data)
                }

                console.log('')
                header('Test Complete')
                resolve()
            })
        })

        req.on('error', (error) => {
            log(`✗ Request failed: ${error.message}`, colors.red)
            console.log('')
            log('Make sure your dev server is running: npm run dev', colors.yellow)
            console.log('')
            header('Test Failed')
            reject(error)
        })

        req.end()
    })
}

// Run the test
testCronEndpoint().catch((error) => {
    process.exit(1)
})
