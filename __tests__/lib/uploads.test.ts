/**
 * @jest-environment node
 */

import {
    allowedAvatarUrl,
    isUploadUrl,
    newUploadKey,
    ownedUploadKey,
    ownUploads,
    UPLOAD_TYPES,
} from '../../lib/uploads'
import { isUploadPath } from '../../worker/uploads'

describe('uploads', () => {
    it('stores each upload under the user, with an extension from its type', () => {
        const { key, path } = newUploadKey('user-1', 'image/webp')
        expect(key).toMatch(/^uploads\/user-1\/[0-9a-f-]{36}\.webp$/)
        expect(path).toBe(`/${key}`)
        expect(isUploadPath(path)).toBe(true)
        expect(isUploadUrl(path)).toBe(true)
    })

    it('accepts only raster images: an SVG served from our origin could run script', () => {
        expect(Object.keys(UPLOAD_TYPES)).not.toContain('image/svg+xml')
        expect(() => newUploadKey('user-1', 'image/svg+xml')).toThrow()
        expect(() => newUploadKey('user-1', 'text/html')).toThrow()
    })

    it('lets a user delete only their own uploads', () => {
        const { path } = newUploadKey('user-1', 'image/png')
        expect(ownedUploadKey(path, 'user-1')).toBe(path.slice(1))
        expect(ownedUploadKey(`https://example.com${path}`, 'user-1')).toBe(path.slice(1))
        expect(ownedUploadKey(path, 'user-2')).toBeNull()
        // A crafted query string or traversal can't pass.
        expect(ownedUploadKey(`/uploads/user-2/a.png?x=/uploads/user-1/`, 'user-1')).toBeNull()
        expect(ownedUploadKey('/uploads/user-1/../user-2/a.png', 'user-1')).toBeNull()
        expect(ownedUploadKey('/uploads/user-1/nested/a.png', 'user-1')).toBeNull()
    })

    it('serves only well-formed upload paths', () => {
        expect(isUploadPath('/uploads/user-1/abc-123.png')).toBe(true)
        for (const path of [
            '/uploads/',
            '/uploads/user-1/',
            '/uploads/a/b/c.png',
            '/uploads/../x.png',
            '/uploadsx/a/b.png',
        ]) {
            expect(isUploadPath(path)).toBe(false)
        }
    })
})

describe('post images and avatars', () => {
    it('keeps only the poster’s own uploads, as site paths', () => {
        expect(
            ownUploads(
                [
                    '/uploads/u1/abc-123.png',
                    'https://nettrailers.example/uploads/u1/def-456.jpg',
                    '/uploads/u2/someone-else.png',
                    'https://tracker.example/pixel.gif',
                    42,
                ],
                'u1'
            )
        ).toEqual(['/uploads/u1/abc-123.png', '/uploads/u1/def-456.jpg'])
        expect(ownUploads('not-a-list', 'u1')).toEqual([])
    })

    it('allows own uploads and known avatar hosts only', () => {
        expect(allowedAvatarUrl('/uploads/u1/abc-123.png', 'u1')).toBe('/uploads/u1/abc-123.png')
        expect(allowedAvatarUrl('https://avatars.githubusercontent.com/u/1?v=4', 'u1')).toBe(
            'https://avatars.githubusercontent.com/u/1?v=4'
        )
        expect(allowedAvatarUrl('/uploads/u2/abc-123.png', 'u1')).toBeNull()
        expect(allowedAvatarUrl('https://tracker.example/me.png', 'u1')).toBeNull()
        expect(allowedAvatarUrl('http://avatars.githubusercontent.com/u/1', 'u1')).toBeNull()
        expect(allowedAvatarUrl('javascript:alert(1)', 'u1')).toBeNull()
        expect(allowedAvatarUrl('data:image/png;base64,AAAA', 'u1')).toBeNull()
    })
})
