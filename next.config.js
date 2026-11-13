const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})

const { stackVersionsFrom } = require('./lib/stackVersions')

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next 16.4 `next dev` writes agent rules into AGENTS.md when a coding agent runs it; keep the tree clean.
    agentRules: false,
    // The About dialog's stack chips show these majors, read from package.json at build time
    env: {
        NEXT_PUBLIC_STACK_VERSIONS: JSON.stringify(stackVersionsFrom(require('./package.json'))),
    },
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: false,
    },
    // Markdown imports are their text, read at build time (app/api/changelog).
    turbopack: {
        rules: {
            '*.md': { type: 'raw' },
        },
    },
    // Exclude packages from server bundling optimization
    serverExternalPackages: ['@libsql/client'],
    compiler: {
        // Remove console.log in production builds (keep error and warn)
        removeConsole:
            process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    images: {
        // TMDB images load straight from image.tmdb.org at TMDB's own sizes;
        // only uploads and avatars go through the optimizer (lib/imageLoader.ts).
        // image.tmdb.org is not a remote pattern, so /_next/image never resizes it.
        loader: 'custom',
        loaderFile: './lib/imageLoader.ts',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'rb.gy',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
            },
        ],
        qualities: [25, 50, 75, 100],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // Optimize for faster builds and caching - disabled heroicons optimization due to runtime errors
    experimental: {
        // optimizePackageImports: ['@heroicons/react'],
        // forbidden() answers a real 403 (the admin pages' server gate, app/admin/layout.tsx).
        authInterrupts: true,
    },
    // Redirects for removed routes
    async redirects() {
        return [
            {
                source: '/tv',
                destination: '/',
                permanent: true, // 301 redirect
            },
            {
                source: '/movies',
                destination: '/',
                permanent: true, // 301 redirect
            },
            {
                // An HTTP redirect lands at the top of the page; an in-app redirect
                // scrolled phones down to the nested settings panel
                source: '/settings',
                destination: '/settings/preferences',
                permanent: false,
            },
        ]
    },
    // Security headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
                    },
                    // The Content-Security-Policy is set per request with a fresh
                    // script nonce by the proxy (proxy.ts, lib/csp.ts).
                    // HTTP Strict Transport Security
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                ],
            },
        ]
    },
}

const sentryWebpackPluginOptions = {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
}

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions)
