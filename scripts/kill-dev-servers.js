#!/usr/bin/env node

/**
 * Kill Dev Servers Utility
 *
 * Forcefully kills all Next.js development servers and cleans up lock files.
 * WSL2-compatible using pkill.
 */

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔪 Killing all Next.js dev servers...')

// Remove lock file
const LOCK_FILE = path.join(__dirname, '..', '.next-dev-lock')
if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE)
    console.log('✅ Removed lock file')
}

// Kill Next.js processes (WSL2-compatible using pkill)
exec('pkill -f "next dev" || true', (error, stdout, stderr) => {
    if (error && error.code !== 1) {
        console.error('⚠️  Error killing processes:', stderr)
    } else {
        console.log('✅ Killed all Next.js dev processes')
    }

    // Also try to kill node processes on common dev ports
    const PORT = process.env.PORT || 3000
    exec(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, (portError) => {
        if (!portError) {
            console.log(`✅ Freed port ${PORT}`)
        }
        console.log('\n✨ All dev servers stopped. Run "npm run dev" to start fresh.')
    })
})
