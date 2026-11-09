/**
 * One-off repair: the first demo seed stored placeholder poster paths
 * (/poster1.jpg, /poster2.jpg, /poster3.jpg) in the "Mind-Bending Movies" demo
 * ranking, so its posters 404 on the Community page. This rewrites those items
 * to the real TMDB poster and backdrop paths. Idempotent and limited to the
 * demo user's rankings.
 *
 *   npx tsx scripts/fix-demo-ranking-posters.ts            # dry run
 *   npx tsx scripts/fix-demo-ranking-posters.ts --apply    # write
 *
 * Point it at production with the Vercel env, without writing secrets to disk:
 *   vercel env run -e production -- npx tsx scripts/fix-demo-ranking-posters.ts --apply
 */

import './load-env'

import { eq } from 'drizzle-orm'

import { db } from '../db'
import { rankings } from '../db/schema'
import type { RankedItem } from '../types/rankings'

const DEMO_USER_ID = 'demo-seed-user'

/** Real TMDB image paths for the seeded titles (checked against TMDB on 2026-11-08). */
const REAL_IMAGES: Record<number, { poster_path: string; backdrop_path: string }> = {
    550: {
        poster_path: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
        backdrop_path: '/c6OLXfKAk5BKeR6broC8pYiCquX.jpg',
    },
    157336: {
        poster_path: '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
        backdrop_path: '/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
    },
    27205: {
        poster_path: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
        backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    },
}

const PLACEHOLDER = /^\/poster\d+\.jpg$/

async function main() {
    const apply = process.argv.includes('--apply')
    const rows = await db.select().from(rankings).where(eq(rankings.userId, DEMO_USER_ID))

    let changed = 0
    for (const row of rows) {
        const items = (row.rankedItems ?? []) as RankedItem[]
        let rowChanged = false
        const fixed = items.map((item) => {
            const real = REAL_IMAGES[item.content.id]
            if (!real || !PLACEHOLDER.test(item.content.poster_path ?? '')) return item
            rowChanged = true
            return { ...item, content: { ...item.content, ...real } } as RankedItem
        })
        if (!rowChanged) continue
        changed++
        console.log(`${apply ? 'Fixing' : 'Would fix'} ranking ${row.id} (${row.title})`)
        if (apply) {
            await db.update(rankings).set({ rankedItems: fixed }).where(eq(rankings.id, row.id))
        }
    }
    console.log(
        changed === 0 ? 'Nothing to fix.' : `${changed} ranking(s) ${apply ? 'fixed' : 'to fix'}.`
    )
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
