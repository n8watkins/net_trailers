/**
 * @jest-environment node
 */

import { isUploadUrl, newUploadKey, ownedUploadKey, UPLOAD_TYPES } from '../../lib/uploads'
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
