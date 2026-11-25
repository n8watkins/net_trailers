/**
 * The Security page once described the old Firebase app (Firebase Auth,
 * Firestore rules, DOMPurify, password reset). None of that exists, so the
 * words must never come back to the page or to SECURITY.md.
 */

import { readFileSync, existsSync } from 'fs'
import path from 'path'

import { SECURITY_INTRO, SECURITY_SECTIONS } from '@/app/security/content'

const root = path.resolve(__dirname, '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')

const BANNED_ON_PAGE = [/firebase/i, /firestore/i, /dompurify/i, /password[\s-]*reset/i]
const BANNED_IN_DOC = [/firebase/i, /firestore/i, /dompurify/i]

describe('Security page text', () => {
    const shownText = [
        SECURITY_INTRO,
        ...SECURITY_SECTIONS.flatMap((s) => [s.title, ...s.claims.map((c) => c.text)]),
    ].join('\n')

    it.each(BANNED_ON_PAGE.map((re) => [re.source, re] as const))(
        'never mentions %s',
        (_name, re) => {
            expect(shownText).not.toMatch(re)
            expect(read('app/security/page.tsx')).not.toMatch(re)
            expect(read('app/security/content.ts')).not.toMatch(re)
            expect(read('app/security/layout.tsx')).not.toMatch(re)
        }
    )

    it('has no marketing badge or green theme', () => {
        const source = read('app/security/page.tsx')
        expect(shownText).not.toMatch(/production ready|cinematic/i)
        expect(source).not.toMatch(/\b(?:green|emerald)-\d{2,3}/)
    })

    it('states each claim with the code that makes it true', () => {
        for (const section of SECURITY_SECTIONS) {
            expect(section.claims.length).toBeGreaterThan(0)
            for (const claim of section.claims) {
                expect(claim.text.trim()).not.toBe('')
                expect(claim.evidence.trim()).not.toBe('')
            }
        }
    })
})

describe('SECURITY.md', () => {
    const doc = read('SECURITY.md')

    it.each(BANNED_IN_DOC.map((re) => [re.source, re] as const))('never mentions %s', (_n, re) => {
        expect(doc).not.toMatch(re)
    })

    it('does not point at files that are gone', () => {
        const mentioned = Array.from(
            doc.matchAll(/`((?:lib|utils|db|stores|app)\/[\w./[\]-]+\.tsx?)`/g)
        ).map((m) => m[1])
        const missing = mentioned.filter((file) => !existsSync(path.join(root, file)))
        expect(missing).toEqual([])
    })
})

describe('Firebase leftovers', () => {
    it('storage.rules is gone', () => {
        expect(existsSync(path.join(root, 'storage.rules'))).toBe(false)
    })
})
