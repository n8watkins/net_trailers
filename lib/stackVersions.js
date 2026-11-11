/**
 * Major versions of the headline stack, read from package.json at build time
 * (next.config.js puts them in NEXT_PUBLIC_STACK_VERSIONS), so the About
 * dialog never shows a hard-coded, stale version.
 *
 * CommonJS so next.config.js can require it.
 */

/** package.json dependency name for each About chip that shows a version. */
const STACK_PACKAGES = {
    next: 'next',
    react: 'react',
    typescript: 'typescript',
    tailwind: 'tailwindcss',
}

/** "^16.4.3" -> "16", "5.0.0-beta.32" -> "5"; null when there is no number. */
function majorOf(range) {
    if (typeof range !== 'string') return null
    const match = range.match(/(\d+)(?:\.\d+)*/)
    return match ? match[1] : null
}

/** { next: "16", react: "19", ... } from a parsed package.json. */
function stackVersionsFrom(pkg) {
    const all = { ...(pkg.devDependencies || {}), ...(pkg.dependencies || {}) }
    const out = {}
    for (const [key, name] of Object.entries(STACK_PACKAGES)) {
        const major = majorOf(all[name])
        if (major) out[key] = major
    }
    return out
}

module.exports = { STACK_PACKAGES, majorOf, stackVersionsFrom }
