'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
    ShieldCheckIcon,
    LockClosedIcon,
    KeyIcon,
    FingerPrintIcon,
    ServerIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'

interface SecurityFeature {
    icon: ComponentType<{ className?: string }>
    title: string
    description: string
    details: string[]
}

const securityFeatures: SecurityFeature[] = [
    {
        icon: FingerPrintIcon,
        title: 'Authentication & Authorization',
        description:
            'Secure user identity management with Firebase Authentication and multi-level authorization.',
        details: [
            'Firebase Authentication with Google Sign-In and Email/Password',
            'Server-side ID token verification on all protected routes',
            'Admin authorization with UID validation',
            'Timing-safe secret comparison for cron job authentication',
        ],
    },
    {
        icon: ShieldCheckIcon,
        title: 'Input Validation & Sanitization',
        description:
            'All user inputs are validated and sanitized to prevent injection attacks and ensure data integrity.',
        details: [
            'DOMPurify sanitization strips all HTML from user content',
            'Control character removal prevents injection attacks',
            'Length limits and type validation on all inputs',
            'Emoji validation blocks dangerous characters',
        ],
    },
    {
        icon: ServerIcon,
        title: 'API Security',
        description:
            'Comprehensive API protection with rate limiting, request validation, and secure endpoints.',
        details: [
            'Rate limiting: AI requests, password reset, email verification',
            'Cryptographic tokens with expiration (1-24 hours)',
            'Request size limits: 1MB general, 500KB JSON',
            'Single-use tokens deleted after verification',
        ],
    },
    {
        icon: LockClosedIcon,
        title: 'Data Protection',
        description:
            'Your data is protected by comprehensive Firestore security rules and isolated storage.',
        details: [
            '540+ lines of Firestore security rules',
            'Users can only access their own data',
            'Schema validation on all database writes',
            'Stat manipulation prevention (views/likes limited to +1/-1)',
        ],
    },
    {
        icon: KeyIcon,
        title: 'Child Safety Features',
        description:
            'PIN-protected child safety mode with content filtering based on age-appropriate ratings.',
        details: [
            'Content filtering by MPAA and TV ratings',
            '4-6 digit PIN with bcrypt encryption (10 rounds)',
            'Rate limiting: 5 failed attempts = 5-minute lockout',
            'Session-based verification resets on browser close',
        ],
    },
    {
        icon: ExclamationTriangleIcon,
        title: 'Security Headers',
        description:
            'Industry-standard HTTP security headers protect against common web vulnerabilities.',
        details: [
            'Content Security Policy (CSP) prevents XSS attacks',
            'Strict-Transport-Security enforces HTTPS',
            'X-Frame-Options: DENY prevents clickjacking',
            'Permissions-Policy restricts browser features',
        ],
    },
]

interface SecurityStatus {
    category: string
    status: 'implemented' | 'monitoring'
    items: string[]
}

const securityStatuses: SecurityStatus[] = [
    {
        category: 'Authentication',
        status: 'implemented',
        items: [
            'Firebase Authentication',
            'Server-side token verification',
            'Admin UID validation',
            'Timing-safe cron secrets',
        ],
    },
    {
        category: 'Data Protection',
        status: 'implemented',
        items: [
            'Firestore security rules',
            'Firebase Storage rules',
            'User data isolation',
            'Input sanitization',
        ],
    },
    {
        category: 'API Security',
        status: 'implemented',
        items: [
            'Rate limiting (general, AI, auth)',
            'Request size limits',
            'API key protection',
            'CORS configuration',
        ],
    },
    {
        category: 'Monitoring',
        status: 'monitoring',
        items: [
            'Sentry error tracking',
            'Rate limit violations',
            'Auth failures',
            'Input validation rejections',
        ],
    },
]

export default function SecurityPage() {
    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-green-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-green-900/20 via-emerald-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-green-500/10 via-green-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-green-500/30 blur-2xl scale-150" />
                                <ShieldCheckIcon className="relative w-16 h-16 text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-green-200 via-emerald-100 to-green-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    Security
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                NetTrailer is built with security as a core principle. Learn about
                                the measures we&apos;ve implemented to protect your data and ensure
                                a safe experience.
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-8">
                        {/* Security Status Overview */}
                        <div className="bg-zinc-900/40 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800/50">
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                                <h2 className="text-xl font-semibold text-white">
                                    Security Status: Production Ready
                                </h2>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {securityStatuses.map((status) => (
                                    <div
                                        key={status.category}
                                        className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <div
                                                className={`w-2 h-2 rounded-full ${
                                                    status.status === 'implemented'
                                                        ? 'bg-green-500'
                                                        : 'bg-blue-500'
                                                }`}
                                            />
                                            <h3 className="font-medium text-white">
                                                {status.category}
                                            </h3>
                                        </div>
                                        <ul className="space-y-1">
                                            {status.items.map((item) => (
                                                <li
                                                    key={item}
                                                    className="text-sm text-gray-400 flex items-start gap-2"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security Features Grid */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6">
                                Security Measures
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {securityFeatures.map((feature) => (
                                    <div
                                        key={feature.title}
                                        className="bg-zinc-900/40 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-green-500/10 rounded-lg">
                                                <feature.icon className="w-6 h-6 text-green-400" />
                                            </div>
                                            <h3 className="font-semibold text-white">
                                                {feature.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-400 text-sm mb-4">
                                            {feature.description}
                                        </p>
                                        <ul className="space-y-2">
                                            {feature.details.map((detail) => (
                                                <li
                                                    key={detail}
                                                    className="text-sm text-gray-500 flex items-start gap-2"
                                                >
                                                    <span className="text-green-400 mt-1">
                                                        &#8226;
                                                    </span>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Technical Details */}
                        <div className="bg-zinc-900/40 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800/50">
                            <h2 className="text-xl font-semibold text-white mb-6">
                                Technical Implementation
                            </h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-4">
                                        Security Headers
                                    </h3>
                                    <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-gray-400 overflow-x-auto border border-zinc-800/30">
                                        <div className="space-y-1">
                                            <p>
                                                <span className="text-green-400">
                                                    Content-Security-Policy:
                                                </span>{' '}
                                                default-src &apos;self&apos;; ...
                                            </p>
                                            <p>
                                                <span className="text-green-400">
                                                    X-Frame-Options:
                                                </span>{' '}
                                                DENY
                                            </p>
                                            <p>
                                                <span className="text-green-400">
                                                    X-Content-Type-Options:
                                                </span>{' '}
                                                nosniff
                                            </p>
                                            <p>
                                                <span className="text-green-400">
                                                    Strict-Transport-Security:
                                                </span>{' '}
                                                max-age=31536000
                                            </p>
                                            <p>
                                                <span className="text-green-400">
                                                    Referrer-Policy:
                                                </span>{' '}
                                                strict-origin-when-cross-origin
                                            </p>
                                            <p>
                                                <span className="text-green-400">
                                                    Permissions-Policy:
                                                </span>{' '}
                                                camera=(), geolocation=()
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-4">
                                        Encryption & Hashing
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
                                            <span className="text-gray-400">PIN Protection</span>
                                            <span className="text-green-400 text-sm">
                                                bcrypt (10 rounds)
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
                                            <span className="text-gray-400">Token Comparison</span>
                                            <span className="text-green-400 text-sm">
                                                crypto.timingSafeEqual
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
                                            <span className="text-gray-400">Transport</span>
                                            <span className="text-green-400 text-sm">
                                                HTTPS/TLS 1.3
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
                                            <span className="text-gray-400">
                                                Password Reset Tokens
                                            </span>
                                            <span className="text-green-400 text-sm">
                                                crypto.randomBytes(32)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documentation Link */}
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/20">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <DocumentTextIcon className="w-6 h-6 text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        Full Security Documentation
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-4">
                                        For detailed technical information about our security
                                        implementation, including code references and configuration
                                        details, view our full security documentation.
                                    </p>
                                    <a
                                        href="https://github.com/n8watkins/net_trailers/blob/main/SECURITY.md"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                                    >
                                        View SECURITY.md on GitHub
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Portfolio Note */}
                        <div className="bg-zinc-900/40 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800/50">
                            <h2 className="text-xl font-semibold text-white mb-4">
                                About This Project
                            </h2>
                            <p className="text-gray-400">
                                NetTrailer is a portfolio project demonstrating modern web security
                                practices in a Next.js application. The security measures documented
                                here represent real implementations used throughout the codebase,
                                showcasing production-grade security patterns for authentication,
                                data protection, and API security.
                            </p>
                        </div>

                        {/* Related Links */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link
                                href="/privacy"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Privacy Policy
                            </Link>
                            <span className="text-gray-600">|</span>
                            <Link
                                href="/terms"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Terms of Service
                            </Link>
                            <span className="text-gray-600">|</span>
                            <Link
                                href="/changelog"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Changelog
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </SubPageLayout>
    )
}
