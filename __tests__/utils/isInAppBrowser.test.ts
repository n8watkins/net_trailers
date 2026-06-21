import { isInAppBrowser } from '@/utils/isInAppBrowser'

describe('isInAppBrowser', () => {
    it('flags known in-app webviews', () => {
        const inApp = [
            'Mozilla/5.0 (iPhone) ... [FBAN/FBIOS;FBAV/...]', // Facebook
            'Mozilla/5.0 (iPhone) ... Instagram 300.0.0', // Instagram
            'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit', // Android WebView
            'Mozilla/5.0 ... GSA/300.0', // Google app
            'Mozilla/5.0 ... MicroMessenger/8.0', // WeChat
        ]
        for (const ua of inApp) expect(isInAppBrowser(ua)).toBe(true)
    })

    it('passes real browsers through', () => {
        const real = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
            'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        ]
        for (const ua of real) expect(isInAppBrowser(ua)).toBe(false)
    })

    it('is safe with no user agent', () => {
        expect(isInAppBrowser('')).toBe(false)
    })
})
