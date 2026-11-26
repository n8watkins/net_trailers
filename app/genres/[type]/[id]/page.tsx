import type { Metadata } from 'next'
import { genreHeading } from '@/lib/genreTitle'
import GenreClient from './GenreClient'

type Props = {
    params: Promise<{ type: string; id: string }>
    searchParams: Promise<{ name?: string | string[]; title?: string | string[] }>
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { type, id } = await params
    const query = await searchParams
    const heading = genreHeading(type, id, first(query.name), first(query.title))
    return {
        title: `${heading} - NetTrailers`,
        description: `Trailers for ${heading} on NetTrailers.`,
    }
}

export default function GenrePage() {
    return <GenreClient />
}
