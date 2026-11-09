import { readableTextOn } from '../../utils/readableText'

describe('readableTextOn', () => {
    it('uses dark text on light accents', () => {
        expect(readableTextOn('#F59E0B')).toBe('#0a0a0a')
        expect(readableTextOn('#fff')).toBe('#0a0a0a')
    })

    it('uses white text on dark or saturated colours', () => {
        expect(readableTextOn('#3b82f6')).toBe('white')
        expect(readableTextOn('#141414')).toBe('white')
        expect(readableTextOn('#DC2626')).toBe('white')
    })

    it('falls back to white for unparseable input', () => {
        expect(readableTextOn('not-a-colour')).toBe('white')
    })
})
