/**
 * Load environment variables from .env.local for Node.js scripts
 * This must be imported BEFORE any Firebase imports
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local file
try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envFile = readFileSync(envPath, 'utf-8')

    // Parse and set environment variables
    envFile.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim()
                process.env[key.trim()] = value

                // Debug: Show what we loaded (only for Firebase keys)
                if (key.includes('FIREBASE')) {
                    console.log(`✓ Loaded ${key.trim()}: ${value.substring(0, 20)}...`)
                }
            }
        }
    })

    console.log('✅ Environment variables loaded from .env.local')
} catch (error) {
    console.error('❌ Failed to load .env.local:', error)
    throw error
}
