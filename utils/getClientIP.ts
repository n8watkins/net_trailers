/**
 * Client IP Address Extraction
 *
 * Extracts client IP address from request headers
 * Works with Vercel deployment and local development
 */

/**
 * Get client IP address from request headers
 *
 * Checks multiple header sources in priority order:
 * 1. x-forwarded-for (Vercel, most proxies)
 * 2. x-real-ip (nginx, some CDNs)
 * 3. x-vercel-forwarded-for (Vercel-specific)
 *
 * @param request - Next.js request object
 * @returns IP address string or null if not found
 */
export function getClientIP(request: Request): string | null {
    // Try x-forwarded-for first (most common)
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        // x-forwarded-for can be a comma-separated list of IPs
        // Format: "client, proxy1, proxy2"
        // We want the first IP (the actual client)
        const firstIP = forwardedFor.split(',')[0].trim()
        if (firstIP) {
            return firstIP
        }
    }

    // Try x-real-ip (nginx and some CDNs)
    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP.trim()
    }

    // Try Vercel-specific header
    const vercelIP = request.headers.get('x-vercel-forwarded-for')
    if (vercelIP) {
        return vercelIP.trim()
    }

    // Fallback: return null (will skip IP-based limiting)
    // This happens in local development without a proxy
    return null
}

/**
 * Validate IP address format (basic check)
 *
 * @param ip - IP address string to validate
 * @returns true if valid IPv4 or IPv6 format
 */
export function isValidIP(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipv4Regex.test(ip)) {
        // Validate each octet is 0-255
        const octets = ip.split('.')
        return octets.every((octet) => {
            const num = parseInt(octet, 10)
            return num >= 0 && num <= 255
        })
    }

    // IPv6 regex (basic check)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/
    if (ipv6Regex.test(ip)) {
        return true
    }

    // IPv6 compressed format
    if (ip.includes('::')) {
        return true
    }

    return false
}

/**
 * Sanitize IP address for storage
 *
 * Removes any invalid characters and normalizes format
 *
 * @param ip - Raw IP address string
 * @returns Sanitized IP or null if invalid
 */
export function sanitizeIP(ip: string | null): string | null {
    if (!ip) return null

    const trimmed = ip.trim()

    // Remove port number if present (e.g., "192.168.1.1:3000" -> "192.168.1.1")
    const withoutPort = trimmed.split(':')[0]

    // Validate
    if (isValidIP(withoutPort)) {
        return withoutPort
    }

    return null
}

/**
 * Get and sanitize client IP from request
 *
 * Combines getClientIP with sanitization
 *
 * @param request - Next.js request object
 * @returns Sanitized IP address or null
 */
export function getAndSanitizeClientIP(request: Request): string | null {
    const rawIP = getClientIP(request)
    return sanitizeIP(rawIP)
}
