import type { Metadata } from 'next'
import { selfFetch } from '@/lib/selfFetch'
import PersonClient from './PersonClient'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    let name = ''
    try {
        const response = await selfFetch(`/api/people/${encodeURIComponent(id)}`)
        if (response.ok) name = String((await response.json()).name ?? '')
    } catch {
        // The page still loads; the tab falls back to a plain title.
    }
    return {
        title: name ? `${name} - NetTrailers` : 'Person - NetTrailers',
        description: name ? `Films and shows with ${name} on NetTrailers.` : undefined,
    }
}

export default function PersonPage() {
    return <PersonClient />
}
