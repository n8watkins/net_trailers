const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: false,
    },
    // Exclude packages from server bundling optimization
    serverExternalPackages: ['isomorphic-dompurify'],
    compiler: {
        // Remove console.log in production builds (keep error and warn)
        removeConsole:
            process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'image.tmdb.org',
            },
            {
                protocol: 'https',
                hostname: 'rb.gy',
            },
            {
                protocol: 'https',
                hostname: 'assets.nflxext.com',
            },
            {
                protocol: 'https',
                hostname: 'occ-0-3997-3996.1.nflxso.net',
            },
            {
                protocol: 'https',
                hostname: '*.nflxso.net',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
        qualities: [25, 50, 75, 100],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // Optimize for faster builds and caching - disabled heroicons optimization due to runtime errors
    experimental: {
        // optimizePackageImports: ['@heroicons/react'],
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
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
                    },
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://www.gstatic.com https://apis.google.com https://vercel.live",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://vercel.live",
                            "img-src 'self' data: https: blob:",
                            "font-src 'self' data: https://fonts.gstatic.com https://vercel.live https://assets.vercel.com",
                            "connect-src 'self' https://api.themoviedb.org https://www.google-analytics.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebaseinstallations.googleapis.com https://accounts.google.com https://*.firebaseapp.com https://*.sentry.io https://vercel.live https://*.pusher.com wss://*.pusher.com",
                            "frame-src 'self' https://www.youtube.com https://accounts.google.com https://*.firebaseapp.com https://vercel.live",
                            "media-src 'self' https:",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                            "frame-ancestors 'none'",
                            'upgrade-insecure-requests',
                        ].join('; '),
                    },
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
    automaticVercelMonitors: true,
}

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions)
