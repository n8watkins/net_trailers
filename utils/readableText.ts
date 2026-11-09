/**
 * Pick black or white text for a solid background colour, so light accent
 * colours (amber, yellow, light green) never carry white text.
 *
 * @param hex - background colour as #rgb or #rrggbb
 * @returns a CSS colour for text on that background
 */
export function readableTextOn(hex: string): string {
    const clean = hex.replace('#', '')
    const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean
    const value = parseInt(full.slice(0, 6), 16)
    if (Number.isNaN(value)) return 'white'
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luminance > 0.4 ? '#0a0a0a' : 'white'
}
