// Regenerates the NetTrailers icon set: a red play button on a near-black film-frame tile.
// Run: node scripts/generate-brand-icons.mjs   (needs sharp, which Next.js already installs)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

const RED = '#E50914'
const TILE = '#141414'
const EDGE = '#2A2A2A'

const holes = (fill, opacity) =>
    `<g fill="${fill}" fill-opacity="${opacity}">${[12, 23.5, 35, 46.5]
        .flatMap((x) => [6, 54].map((y) => `<rect x="${x}" y="${y}" width="5.5" height="4" rx="1.3"/>`))
        .join('')}</g>`
const play = `<path d="M26 21.5 L44 32 L26 42.5 Z" fill="${RED}" stroke="${RED}" stroke-width="5" stroke-linejoin="round"/>`

// The mark inside a rounded tile (icon.svg, nettrailers-mark.svg, the logo's left half).
const tile = `<rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="${TILE}" stroke="${EDGE}" stroke-width="1.5"/>${holes(RED, 0.55)}${play}`

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="NetTrailers">\n  ${tile}\n</svg>\n`
writeFileSync(path.join(root, 'icon.svg'), iconSvg)
writeFileSync(path.join(root, 'nettrailers-mark.svg'), iconSvg)

// The wordmark file keeps its paths; only the tile and the "Trailers" fill change.
const logoPath = path.join(root, 'nettrailers-logo.svg')
let logo = readFileSync(logoPath, 'utf8')
const wordmark = logo.slice(logo.indexOf('<g transform="translate(66'))
logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 274 52" width="274" height="52" role="img" aria-label="NetTrailers">\n  <g transform="scale(0.8125)">${tile}</g>\n  ${wordmark.replace(/fill="#FCD34D"/i, `fill="${RED}"`)}`
writeFileSync(logoPath, logo)

// Full-bleed variant for maskable icons: the mark stays inside the 80% safe circle.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${TILE}"/><g transform="translate(32 32) scale(0.72) translate(-32 -32)">${holes(RED, 0.55)}${play}</g></svg>`

const png = (svg, size, out) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(path.join(root, out))

await png(iconSvg, 512, 'icon-512.png')
await png(iconSvg, 192, 'icon-192.png')
await png(iconSvg, 180, 'apple-touch-icon.png')
await png(iconSvg, 96, 'email/nettrailers-mark-96.png')
await png(maskable, 512, 'icon-maskable-512.png')

// favicon.ico: 16 and 32 px PNG frames in an ICO container.
const frames = await Promise.all(
    [16, 32].map((s) => sharp(Buffer.from(iconSvg), { density: 384 }).resize(s, s).png().toBuffer())
)
const header = Buffer.alloc(6)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(frames.length, 4)
let offset = 6 + 16 * frames.length
const dirs = frames.map((buf, i) => {
    const d = Buffer.alloc(16)
    const s = [16, 32][i]
    d.writeUInt8(s, 0)
    d.writeUInt8(s, 1)
    d.writeUInt16LE(1, 4)
    d.writeUInt16LE(32, 6)
    d.writeUInt32LE(buf.length, 8)
    d.writeUInt32LE(offset, 12)
    offset += buf.length
    return d
})
writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([header, ...dirs, ...frames]))
console.log('icons written')
