import { NextRequest, NextResponse } from 'next/server'
import { generateSmartSuggestions } from '../../../utils/smartRowSuggestions'

export async function POST(request: NextRequest) {
    try {
        const inputData = await request.json()

        // Validate input
        if (!inputData.entities || !Array.isArray(inputData.entities)) {
            return NextResponse.json({ error: 'Invalid entities' }, { status: 400 })
        }

        if (!inputData.mediaType || !['movie', 'tv', 'both'].includes(inputData.mediaType)) {
            return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
        }

        // Generate suggestions
        const result = await generateSmartSuggestions(inputData)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Smart suggestions error:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}
