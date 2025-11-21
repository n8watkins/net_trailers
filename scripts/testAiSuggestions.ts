/**
 * Test script for AI Suggestions API
 *
 * Run with: npx tsx scripts/testAiSuggestions.ts
 */

const BASE_URL = 'http://localhost:3000'

interface AISuggestionsResponse {
    results: Array<{
        id: number
        title?: string
        name?: string
        media_type: string
    }>
    generatedName: string
    genreFallback: number[]
    mediaType: 'movie' | 'tv' | 'both'
    emoji: string
    color: string
    _meta?: {
        model: string
        latency: number
    }
    error?: string
}

async function testAiSuggestions(query: string, mode: 'suggestions' | 'row' | 'watchlist') {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: "${query}" (mode: ${mode})`)
    console.log('='.repeat(60))

    try {
        const response = await fetch(`${BASE_URL}/api/ai-suggestions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                mode,
                conversationHistory: [],
                existingMovies: [],
            }),
        })

        // Check if response is OK first
        if (!response.ok) {
            const text = await response.text()
            console.error(`\n❌ HTTP ${response.status}: ${text}`)
            return
        }

        const data: AISuggestionsResponse = await response.json()

        if (data.error) {
            console.error(`\n❌ Error: ${data.error}`)
            return
        }

        console.log('\n📊 Response:')
        console.log(`  Generated Name: "${data.generatedName}"`)
        console.log(`  Emoji: ${data.emoji}`)
        console.log(`  Color: ${data.color}`)
        console.log(`  Media Type: ${data.mediaType}`)
        console.log(`  Genre Fallback: [${data.genreFallback.join(', ')}]`)
        console.log(`  Results Count: ${data.results.length}`)

        if (data._meta) {
            console.log(`\n🤖 AI Metadata:`)
            console.log(`  Model: ${data._meta.model}`)
            console.log(`  Latency: ${data._meta.latency}ms`)
        }

        console.log('\n🎬 Content Results:')
        data.results.slice(0, 5).forEach((item, i) => {
            const title = item.title || item.name || 'Unknown'
            console.log(`  ${i + 1}. ${title} (${item.media_type})`)
        })
        if (data.results.length > 5) {
            console.log(`  ... and ${data.results.length - 5} more`)
        }

        return data
    } catch (error) {
        console.error(`\n❌ Request failed:`, error)
    }
}

async function runTests() {
    console.log('🧪 AI Suggestions API Test Suite')
    console.log('================================\n')
    console.log('Make sure the dev server is running on localhost:3000')

    // Test different queries and modes
    const tests = [
        { query: 'mind-bending sci-fi thrillers', mode: 'suggestions' as const },
        { query: 'cozy rainy day movies', mode: 'row' as const },
        { query: 'classic 90s action', mode: 'watchlist' as const },
    ]

    for (const test of tests) {
        await testAiSuggestions(test.query, test.mode)
        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log('\n\n✅ All tests completed!')
}

runTests()
