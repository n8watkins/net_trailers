import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Privacy Policy - NetTrailer',
    description:
        'NetTrailer privacy policy - Learn how we collect, use, and protect your personal information',
    keywords: ['privacy', 'policy', 'data protection', 'GDPR'],
}

export default function PrivacyPage() {
    return (
        <div className="relative min-h-screen bg-gradient-to-b from-gray-900/10 to-[#0a0a0a]">
            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16 mt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="prose prose-lg prose-gray max-w-none">
                        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
                        <p className="text-gray-300 text-lg mb-8">
                            Last updated:{' '}
                            {new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>

                        <div className="space-y-8 text-gray-300">
                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    1. Introduction
                                </h2>
                                <p className="mb-4">
                                    NetTrailer (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                                    is committed to protecting your privacy. This Privacy Policy
                                    explains how we collect, use, disclose, and safeguard your
                                    information when you use our movie and TV show discovery
                                    platform.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    2. Information We Collect
                                </h2>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    2.1 Personal Information
                                </h3>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>Email address (when you create an account)</li>
                                    <li>
                                        Display name and profile information (from social login
                                        providers)
                                    </li>
                                    <li>Authentication data (encrypted passwords, OAuth tokens)</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    2.2 Usage Information
                                </h3>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>Search queries and browsing behavior</li>
                                    <li>Movies and TV shows you view or add to favorites</li>
                                    <li>Device information (browser type, operating system)</li>
                                    <li>IP address and location data</li>
                                    <li>Performance and error data for service improvement</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    3. How We Use Your Information
                                </h2>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Provide and maintain our service</li>
                                    <li>Authenticate users and secure accounts</li>
                                    <li>Personalize content recommendations</li>
                                    <li>Save and sync your favorites across devices</li>
                                    <li>Analyze usage patterns to improve our service</li>
                                    <li>Monitor for technical issues and security threats</li>
                                    <li>
                                        Communicate service updates and respond to support requests
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    4. Third-Party Services
                                </h2>
                                <p className="mb-4">
                                    We use the following third-party services that may collect
                                    information:
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-white">
                                            Firebase (Google)
                                        </h4>
                                        <p>
                                            Authentication, user data storage, and hosting services
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">
                                            Google Analytics
                                        </h4>
                                        <p>Website usage analytics and performance monitoring</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">Sentry</h4>
                                        <p>Error monitoring and performance tracking</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">
                                            The Movie Database (TMDB)
                                        </h4>
                                        <p>Movie and TV show data, images, and metadata</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">
                                            Social Login Providers
                                        </h4>
                                        <p>Google, Discord, and Twitter/X for authentication</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    5. Data Storage and Security
                                </h2>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        Your data is stored securely using industry-standard
                                        encryption
                                    </li>
                                    <li>
                                        We use Firebase&apos;s secure infrastructure for data
                                        storage
                                    </li>
                                    <li>
                                        Access to personal information is restricted to authorized
                                        personnel only
                                    </li>
                                    <li>
                                        We regularly monitor for security vulnerabilities and
                                        threats
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    6. Your Rights and Choices
                                </h2>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        <strong>Account Access:</strong> You can view and update
                                        your account information at any time
                                    </li>
                                    <li>
                                        <strong>Data Deletion:</strong> You can delete your account
                                        and associated data
                                    </li>
                                    <li>
                                        <strong>Marketing Opt-out:</strong> Unsubscribe from
                                        promotional communications
                                    </li>
                                    <li>
                                        <strong>Analytics Opt-out:</strong> Use browser settings to
                                        disable analytics tracking
                                    </li>
                                    <li>
                                        <strong>Guest Mode:</strong> Use our service without
                                        creating an account (limited features)
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    7. Data Retention
                                </h2>
                                <p className="mb-4">
                                    We retain your personal information for as long as necessary to
                                    provide our services and fulfill the purposes outlined in this
                                    policy. When you delete your account, we will delete your
                                    personal information within 30 days, except where we are
                                    required to retain it for legal or security purposes.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    8. Children&apos;s Privacy
                                </h2>
                                <p className="mb-4">
                                    Our service is not intended for children under 13 years of age.
                                    We do not knowingly collect personal information from children
                                    under 13. If you are a parent or guardian and believe your child
                                    has provided us with personal information, please contact us.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    9. International Data Transfers
                                </h2>
                                <p className="mb-4">
                                    Your information may be transferred to and maintained on
                                    computers located outside of your state, province, country, or
                                    other governmental jurisdiction where data protection laws may
                                    differ from those in your jurisdiction.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    10. Changes to This Privacy Policy
                                </h2>
                                <p className="mb-4">
                                    We may update this Privacy Policy from time to time. We will
                                    notify you of any changes by posting the new Privacy Policy on
                                    this page and updating the &quot;Last updated&quot; date.
                                    Changes are effective when posted on this page.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    11. Contact Us
                                </h2>
                                <p className="mb-4">
                                    If you have any questions about this Privacy Policy or our data
                                    practices, please contact us:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        Through our support page:{' '}
                                        <a
                                            href="/support"
                                            className="text-red-400 hover:text-red-300 underline"
                                        >
                                            /support
                                        </a>
                                    </li>
                                    <li>
                                        Email:{' '}
                                        <a
                                            href="mailto:privacy@nettrailer.app"
                                            className="text-red-400 hover:text-red-300 underline"
                                        >
                                            privacy@nettrailer.app
                                        </a>
                                    </li>
                                    <li>
                                        GitHub:{' '}
                                        <a
                                            href="https://github.com/n8watkins/net_trailer"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-red-400 hover:text-red-300 underline"
                                        >
                                            Project Repository
                                        </a>
                                    </li>
                                </ul>
                            </section>

                            <section className="border-t border-gray-700 pt-8">
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    12. Legal Basis for Processing (GDPR)
                                </h2>
                                <p className="mb-4">
                                    If you are from the European Economic Area (EEA), our legal
                                    basis for collecting and using your personal information depends
                                    on the context:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        <strong>Performance of Contract:</strong> To provide our
                                        services
                                    </li>
                                    <li>
                                        <strong>Legitimate Interests:</strong> To improve our
                                        service and ensure security
                                    </li>
                                    <li>
                                        <strong>Consent:</strong> For marketing communications and
                                        analytics (where required)
                                    </li>
                                    <li>
                                        <strong>Legal Obligation:</strong> To comply with applicable
                                        laws
                                    </li>
                                </ul>
                            </section>

                            <div className="bg-gray-800/50 rounded-lg p-6 mt-8">
                                <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                                <p className="text-sm text-gray-400">
                                    This policy covers how NetTrailer collects, uses, and protects
                                    your personal information when using our movie and TV discovery
                                    platform. We use industry-standard security practices and only
                                    collect data necessary to provide and improve our services.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
