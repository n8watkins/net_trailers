/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
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
        ],
        qualities: [25, 50, 75, 100],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // Optimize for faster builds and caching
    experimental: {
        optimizePackageImports: ['@heroicons/react'],
    },
    // Aggressive caching for auth pages
    generateBuildId: async () => {
        return 'net-trailers-v1'
    },
}
