#!/usr/bin/env node

const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const LOCK_FILE = path.join(__dirname, '..', '.next-dev-lock')
const PORT = process.env.PORT || 3000

console.log('🔍 Checking for existing development servers...')

// Lock file mechanism for race condition prevention
function createLockFile() {
    const lock = {
        pid: process.pid,
        port: PORT,
        timestamp: Date.now(),
    }
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2))
}

function checkLockFile() {
    if (fs.existsSync(LOCK_FILE)) {
        try {
            const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
            const age = Date.now() - lock.timestamp

            if (age < 30000) {
                // Lock is fresh (< 30 seconds)
                console.error('❌ Another dev server may be running!')
                console.error(`   Lock file: ${LOCK_FILE}`)
                console.error(`   PID: ${lock.pid}, Port: ${lock.port}`)
                console.error('\nOptions:')
                console.error('  1. Kill servers: npm run dev:kill')
                console.error('  2. Force restart: npm run dev:force')
                process.exit(1)
            }

            // Auto-cleanup stale locks
            console.log('⚠️  Removing stale lock file (age: ' + Math.round(age / 1000) + 's)')
            fs.unlinkSync(LOCK_FILE)
        } catch (error) {
            // Corrupted lock file, remove it
            console.log('⚠️  Removing corrupted lock file')
            fs.unlinkSync(LOCK_FILE)
        }
    }
}

// WSL2-compatible port checking using netstat
function checkPortInUse(port, callback) {
    // Use netstat which works reliably in WSL2
    exec(`netstat -tln | grep :${port}`, (error, stdout) => {
        const inUse = stdout.trim().length > 0
        callback(inUse)
    })
}

// Cleanup on exit
process.on('exit', () => {
    if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE)
    }
})

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dev server...')
    process.exit(0)
})

process.on('SIGTERM', () => {
    process.exit(0)
})

// Main startup sequence
checkLockFile()

checkPortInUse(PORT, (inUse) => {
    if (inUse) {
        console.error(`❌ Port ${PORT} is already in use!`)
        console.error('Run: npm run dev:kill')
        process.exit(1)
    }

    createLockFile()
    startDevServer()
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

function shouldShowNextLogs() {
    // Check debug settings - priority order:
    // 1. Environment variable (explicit override)
    // 2. Flag file written by debug console toggle
    // 3. Default: show logs

    // Environment variable takes precedence
    if (process.env.SHOW_NEXT_LOGS === 'false') {
        return false
    }
    if (process.env.SHOW_NEXT_LOGS === 'true') {
        return true
    }

    // Check flag file written by debug console toggle
    try {
        const flagFile = path.join(process.cwd(), '.next-logs-enabled')
        if (fs.existsSync(flagFile)) {
            const content = fs.readFileSync(flagFile, 'utf8').trim()
            if (content === 'false') {
                console.log('📋 Next.js logs disabled via debug console toggle')
                return false
            }
        }
    } catch {
        // Ignore errors reading flag file
    }

    return true // Default: show logs
}

function launchServer() {
    const showLogs = shouldShowNextLogs()

    // Start the dev server with WSL2 optimizations
    const devProcess = spawn('npm', ['run', 'dev:next'], {
        stdio: showLogs ? 'inherit' : ['inherit', 'pipe', 'pipe'],
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

    // Filter Next.js request logs if showNextServerLogs is disabled
    if (!showLogs) {
        const filterNextLogs = (data) => {
            const output = data.toString()
            // Filter out Next.js GET/POST request logs but keep important messages
            const lines = output.split('\n')
            const filtered = lines
                .filter((line) => {
                    // Keep compilation messages, errors, and warnings
                    if (
                        line.includes('compile:') ||
                        line.includes('error') ||
                        line.includes('Error') ||
                        line.includes('warn') ||
                        line.includes('Warning') ||
                        line.includes('✓') ||
                        line.includes('Starting') ||
                        line.includes('Ready') ||
                        line.includes('Local:') ||
                        line.includes('Network:') ||
                        line.includes('Experiments:')
                    ) {
                        return true
                    }

                    // Filter out request logs (GET/POST with status codes and timings)
                    if (/^(GET|POST|PUT|DELETE|PATCH)\s+\//.test(line.trim())) {
                        return false
                    }

                    // Keep everything else
                    return line.trim().length > 0
                })
                .join('\n')

            if (filtered.trim()) {
                process.stdout.write(filtered + '\n')
            }
        }

        devProcess.stdout.on('data', filterNextLogs)
        devProcess.stderr.on('data', filterNextLogs)
    }

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
