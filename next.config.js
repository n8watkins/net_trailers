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
