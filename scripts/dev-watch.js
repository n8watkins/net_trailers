#!/usr/bin/env node

const { spawn, exec } = require('child_process')
const chokidar = require('chokidar')
const path = require('path')

console.log('🔍 Starting dev server with auto-restart watcher...')

let devServer = null
const restartTriggerFiles = [
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    '.env.local',
    '.env',
    'package.json',
]

function killExistingServers() {
    return new Promise((resolve) => {
        exec('pkill -f "next dev"', (error) => {
            // Don't worry about errors - just means no servers to kill
            resolve()
        })
    })
}

function cleanNextCache() {
    return new Promise((resolve) => {
        exec('rm -rf .next', (error) => {
            if (error) console.log('ℹ️  No .next cache to clean')
            resolve()
        })
    })
}

async function startDevServer() {
    if (devServer) {
        console.log('🔄 Restarting dev server...')
        devServer.kill('SIGTERM')
        await new Promise((resolve) => setTimeout(resolve, 1000))
    } else {
        console.log('🚀 Starting dev server...')
        await killExistingServers()
        await cleanNextCache()
    }

    devServer = spawn('npm', ['run', 'dev:next'], {
        stdio: 'inherit',
        shell: true,
    })

    devServer.on('error', (error) => {
        console.error('❌ Dev server error:', error)
    })

    devServer.on('close', (code) => {
        if (code !== 0) {
            console.log(`⚠️  Dev server exited with code ${code}`)
        }
    })
}

// Start the server initially
startDevServer()

// Watch for config file changes
const watcher = chokidar.watch(restartTriggerFiles, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
})

watcher.on('change', (filePath) => {
    console.log(`\n🔧 Config file changed: ${path.basename(filePath)}`)
    console.log('🔄 Auto-restarting dev server...\n')
    startDevServer()
})

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down dev server watcher...')
    if (devServer) devServer.kill('SIGTERM')
    watcher.close()
    process.exit(0)
})

console.log('👀 Watching for config changes. Press Ctrl+C to stop.')
