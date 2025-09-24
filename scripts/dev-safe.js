#!/usr/bin/env node

const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🔍 Checking for existing development servers...')

// Kill any existing Next.js dev processes
exec('pkill -f "next dev"', (error) => {
    if (error && error.code !== 1) {
        console.log('⚠️  Error killing existing processes:', error.message)
    }

    // Kill processes on ports 3000-3010 (common dev ports)
    const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010]
    let portsChecked = 0

    ports.forEach((port) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
            if (stdout.trim()) {
                const pid = stdout.trim()
                exec(`kill -9 ${pid}`, (killError) => {
                    if (!killError) {
                        console.log(`🔫 Killed process on port ${port} (PID: ${pid})`)
                    }
                })
            }

            portsChecked++
            if (portsChecked === ports.length) {
                startDevServer()
            }
        })
    })

    // Fallback if no ports to check
    if (ports.length === 0) {
        startDevServer()
    }
})

function shouldCleanCache() {
    // Check if config files have been modified recently (last 5 minutes)
    const configFiles = [
        'next.config.js',
        'tailwind.config.js',
        'tsconfig.json',
        '.env.local',
        '.env',
        'package.json',
    ]

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    return configFiles.some((file) => {
        try {
            const stats = fs.statSync(file)
            return stats.mtime.getTime() > fiveMinutesAgo
        } catch {
            return false // File doesn't exist, no need to clean
        }
    })
}

function startDevServer() {
    console.log('🚀 Starting fresh development server...')

    // Smart cache cleaning - only clean if config files changed recently
    const needsClean = shouldCleanCache()

    if (needsClean) {
        console.log('🔧 Config files recently changed, cleaning cache...')
        exec('rm -rf .next', (error) => {
            if (error) {
                console.log('⚠️  Could not clean .next directory:', error.message)
            } else {
                console.log('🧹 Cleaned .next directory')
            }
            launchServer()
        })
    } else {
        console.log('💨 Using existing cache for faster startup...')
        launchServer()
    }
}

function launchServer() {
    // Start the dev server with WSL2 optimizations
    const devProcess = spawn('npm', ['run', 'dev:next'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
            ...process.env,
            // Additional WSL2 optimizations
            CHOKIDAR_USEPOLLING: '1',
            WATCHPACK_POLLING: 'true',
            // Increase polling interval for better performance
            CHOKIDAR_INTERVAL: '1000',
        },
    })

    devProcess.on('error', (error) => {
        console.error('❌ Failed to start dev server:', error)
        process.exit(1)
    })

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down dev server...')
        devProcess.kill('SIGTERM')
        process.exit(0)
    })

    process.on('SIGTERM', () => {
        devProcess.kill('SIGTERM')
        process.exit(0)
    })
}
