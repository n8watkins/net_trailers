import imageLoader, { tmdbWidth } from '@/lib/imageLoader'

describe('imageLoader', () => {
    it('sends TMDB images straight to image.tmdb.org at the TMDB size above the width', () => {
        const src = 'https://image.tmdb.org/t/p/w500/abc.jpg'
        expect(imageLoader({ src, width: 96 })).toBe('https://image.tmdb.org/t/p/w154/abc.jpg')
        expect(imageLoader({ src, width: 256 })).toBe('https://image.tmdb.org/t/p/w300/abc.jpg')
        expect(imageLoader({ src, width: 384 })).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
        expect(imageLoader({ src, width: 640 })).toBe('https://image.tmdb.org/t/p/w780/abc.jpg')
    })

    it('ignores the size the caller wrote and caps wide asks at w1280', () => {
        const src = 'https://image.tmdb.org/t/p/original/back.jpg'
        expect(imageLoader({ src, width: 1080 })).toBe('https://image.tmdb.org/t/p/w1280/back.jpg')
        expect(imageLoader({ src, width: 3840 })).toBe('https://image.tmdb.org/t/p/w1280/back.jpg')
        expect(tmdbWidth(16)).toBe(92)
        expect(tmdbWidth(185)).toBe(185)
    })

    it('keeps the optimizer for uploads and other hosts', () => {
        expect(imageLoader({ src: '/uploads/a b.png', width: 128 })).toBe(
            '/_next/image?url=%2Fuploads%2Fa%20b.png&w=128&q=75'
        )
        expect(
            imageLoader({
                src: 'https://avatars.githubusercontent.com/u/1',
                width: 64,
                quality: 80,
            })
        ).toBe('/_next/image?url=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F1&w=64&q=75')
        expect(imageLoader({ src: '/uploads/x.png', width: 64, quality: 90 })).toContain('&q=100')
    })

    it('leaves look-alike hosts to the optimizer', () => {
        const src = 'https://image.tmdb.org.evil.example/t/p/w500/abc.jpg'
        expect(imageLoader({ src, width: 640 })).toMatch(/^\/_next\/image\?url=/)
    })
})
