/**
 * Dynamic Open Graph Image for Shared Collections
 *
 * Generates OG image for shared collection links
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Shared Collection'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

interface Props {
    params: {
        shareId: string
    }
}

export default async function Image({ params }: Props) {
    const { shareId } = params

    // Fetch share data
    let collectionName = 'Shared Collection'
    let itemCount = 0
    let ownerName = ''

    try {
        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/shares/${shareId}`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        })

        if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
                collectionName = data.data.share.collectionName
                itemCount = data.data.share.itemCount
                ownerName = data.data.ownerName || ''
            }
        }
    } catch (error) {
        console.error('Error fetching share data for OG image:', error)
    }

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                }}
            >
                {/* Logo/Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '30px',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(37, 99, 235, 0.2)',
                            borderRadius: '50%',
                            padding: '20px',
                            display: 'flex',
                        }}
                    >
                        <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                        >
                            <path d="M13.544 10.456a4.368 4.368 0 0 0-6.176 0l-3.089 3.088a4.367 4.367 0 1 0 6.177 6.177L12 18.177" />
                            <path d="M10.456 13.544a4.368 4.368 0 0 0 6.176 0l3.089-3.088a4.367 4.367 0 1 0-6.177-6.177L12 5.823" />
                        </svg>
                    </div>
                </div>

                {/* Collection Name */}
                <div
                    style={{
                        fontSize: '56px',
                        fontWeight: 'bold',
                        color: 'white',
                        textAlign: 'center',
                        marginBottom: '20px',
                        maxWidth: '900px',
                        lineHeight: 1.2,
                    }}
                >
                    {collectionName}
                </div>

                {/* Metadata */}
                <div
                    style={{
                        display: 'flex',
                        gap: '30px',
                        fontSize: '24px',
                        color: '#9ca3af',
                        marginBottom: '20px',
                    }}
                >
                    {ownerName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>👤</span>
                            <span>{ownerName}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎬</span>
                        <span>{itemCount} items</span>
                    </div>
                </div>

                {/* NetTrailers branding */}
                <div
                    style={{
                        fontSize: '20px',
                        color: '#3b82f6',
                        marginTop: '30px',
                    }}
                >
                    Shared via NetTrailers
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
