#!/usr/bin/env node

/**
 * Test cron job locally
 * Usage: npm run test:cron
 * or: node scripts/test-cron.js [url]
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
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
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
    header('Local Cron Job Testing Script')

    if (!CRON_SECRET) {
        log('Error: CRON_SECRET not found in .env.local', colors.red)
        process.exit(1)
    }

    log(`Base URL: ${BASE_URL}`, colors.green)
    log(`CRON_SECRET: ${CRON_SECRET.substring(0, 10)}... (hidden)`, colors.green)
    console.log('')

    log('Testing /api/cron/update-trending...', colors.blue)
    console.log('')

    const url = new URL('/api/cron/update-trending', BASE_URL)
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
                    log('Response:', colors.blue)
                    try {
                        const json = JSON.parse(data)
                        console.log(JSON.stringify(json, null, 2))
                    } catch {
                        console.log(data)
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
