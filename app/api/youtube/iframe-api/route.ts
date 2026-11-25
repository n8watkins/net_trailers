/**
 * GET /api/youtube/iframe-api - YouTube's IFrame Player API loader, relayed.
 *
 * Trailers embed from www.youtube-nocookie.com, but the API loader only exists
 * at https://www.youtube.com/iframe_api, and that one response sets YouTube's
 * tracking cookies (YSC, VISITOR_INFO1_LIVE, VISITOR_PRIVACY_METADATA,
 * __Secure-YNID, __Secure-ROLLOUT_TOKEN on .youtube.com) in the visitor's
 * browser (seen 2026-11-25). Fetched here on the server instead, the browser
 * never talks to youtube.com for it, so no cookie is set. The loader is a few
 * hundred bytes that only adds YouTube's widget API script (which sets no
 * cookies) and the player then runs in the no-cookie iframe.
 * lib/youtubeIframeApi.ts loads it before the player mounts.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://www.youtube.com/iframe_api'

/** The loader is small; anything bigger is not what we expect to relay. */
const MAX_BYTES = 64 * 1024

export async function GET() {
    try {
        const upstream = await fetch(UPSTREAM, { headers: { Accept: 'text/javascript' } })
        const type = upstream.headers.get('content-type') ?? ''
        const body = upstream.ok ? await upstream.text() : ''
        if (!upstream.ok || !type.includes('javascript') || !body || body.length > MAX_BYTES) {
            return unavailable(`upstream ${upstream.status} ${type}`)
        }
        return new NextResponse(body, {
            headers: {
                'Content-Type': 'text/javascript; charset=utf-8',
                // YouTube changes the loader with each player release; an hour
                // in the browser and a day at the edge keeps it fresh enough.
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch (error) {
        return unavailable(error instanceof Error ? error.name : 'fetch failed')
    }
}

function unavailable(reason: string) {
    console.warn(`[youtube-iframe-api] relay failed: ${reason}`)
    return new NextResponse('/* YouTube player API unavailable */', {
        status: 502,
        headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    })
}
