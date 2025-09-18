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
