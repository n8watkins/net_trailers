/**
 * API route to toggle Next.js server log filtering
 * Writes a flag file that dev-safe.js reads on startup
 *
 * This bridges the gap between the browser-based debug console toggle
 * and the Node.js dev server script.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FLAG_FILE = path.join(process.cwd(), '.next-logs-enabled')

export async function POST(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const { enabled } = await request.json()

        // Write the flag file
        fs.writeFileSync(FLAG_FILE, enabled ? 'true' : 'false', 'utf8')

        return NextResponse.json({
            success: true,
            enabled,
            message: enabled
                ? 'Next.js logs enabled. Restart dev server to apply.'
                : 'Next.js logs disabled. Restart dev server to apply.',
        })
    } catch (error) {
        console.error('Error writing next-logs flag:', error)
        return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }
}

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        if (fs.existsSync(FLAG_FILE)) {
            const content = fs.readFileSync(FLAG_FILE, 'utf8').trim()
            return NextResponse.json({ enabled: content !== 'false' })
        }
        return NextResponse.json({ enabled: true }) // Default: enabled
    } catch {
        return NextResponse.json({ enabled: true })
    }
}
