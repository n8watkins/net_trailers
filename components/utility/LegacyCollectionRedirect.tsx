'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import useUserData from '../../hooks/useUserData'
import { collectionNameToSlug, getCollectionPath } from '../../utils/slugify'

/**
 * Collections used to live at /<name-slug> (for example /my-favorites). Those
 * addresses now answer 404, so an old bookmark lands on the not-found page;
 * when the slug matches one of this visitor's collections, forward to its
 * current address at /collections/<id>.
 */
export default function LegacyCollectionRedirect() {
    const pathname = usePathname()
    const router = useRouter()
    const { getAllLists } = useUserData()

    useEffect(() => {
        const segments = (pathname ?? '').split('/').filter(Boolean)
        if (segments.length !== 1) return
        const slug = decodeURIComponent(segments[0])
        const match = getAllLists().find(
            (list) => list.id === slug || collectionNameToSlug(list.name) === slug
        )
        if (match) router.replace(getCollectionPath(match))
    }, [pathname, router, getAllLists])

    return null
}
