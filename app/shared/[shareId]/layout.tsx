import { Metadata } from 'next'

interface Props {
    params: { shareId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { shareId } = params

    // Fetch share data for metadata
    let collectionName = 'Shared Collection'
    let description = 'View this shared collection on NetTrailers'
    let itemCount = 0
    let ownerName = ''

    try {
        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'

        const response = await fetch(`${baseUrl}/api/shares/${shareId}`, {
            cache: 'no-store', // Don't cache to ensure fresh data
        })

        if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
                const shareData = data.data
                collectionName = shareData.share.collectionName
                itemCount = shareData.share.itemCount
                ownerName = shareData.ownerName || ''

                description = ownerName
                    ? `${ownerName} shared "${collectionName}" with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
                    : `"${collectionName}" - ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
            }
        }
    } catch (error) {
        console.error('Error fetching share metadata:', error)
    }

    const url = `https://nettrailers.com/shared/${shareId}`

    return {
        title: `${collectionName} | Shared Collection`,
        description,
        openGraph: {
            title: collectionName,
            description,
            url,
            siteName: 'NetTrailers',
            type: 'website',
            images: [
                {
                    url: `/shared/${shareId}/opengraph-image`,
                    width: 1200,
                    height: 630,
                    alt: collectionName,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: collectionName,
            description,
            images: [`/shared/${shareId}/opengraph-image`],
        },
        other: {
            'og:type': 'article',
            'article:published_time': new Date().toISOString(),
        },
    }
}

export default function SharedCollectionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
