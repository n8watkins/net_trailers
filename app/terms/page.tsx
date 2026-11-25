import type { Metadata } from 'next'
import Link from '@/components/common/Link'

export const metadata: Metadata = {
    title: 'Terms of Service - NetTrailers',
    description:
        'NetTrailers terms of service - Terms and conditions for using our movie and TV discovery platform',
    keywords: ['terms', 'service', 'conditions', 'legal'],
}

/** A literal, never the render date: change it when the terms change. */
const LAST_UPDATED = 'November 25, 2026'

export default function TermsPage() {
    return (
        <div className="relative min-h-screen bg-gradient-to-b from-gray-900/10 to-[#0a0a0a]">
            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16 mt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="prose prose-lg prose-gray max-w-none">
                        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
                        <p className="text-gray-300 text-lg mb-8">Last updated: {LAST_UPDATED}</p>

                        <div className="space-y-8 text-gray-300">
                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    1. Acceptance of Terms
                                </h2>
                                <p className="mb-4">
                                    By accessing and using NetTrailers (&quot;the Service&quot;),
                                    you accept and agree to be bound by the terms and provision of
                                    this agreement. If you do not agree to abide by the above,
                                    please do not use this service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    2. Description of Service
                                </h2>
                                <p className="mb-4">
                                    NetTrailers is a movie and TV show discovery platform that
                                    allows users to:
                                </p>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>Browse and search for movies and TV shows</li>
                                    <li>Watch trailers and see details, cast and crew</li>
                                    <li>
                                        Search by mood or description with AI search (Google Gemini)
                                    </li>
                                    <li>
                                        Keep a watchlist, likes, hidden titles and watch history,
                                        and build collections, including AI-generated ones
                                    </li>
                                    <li>Get recommendations based on what you like</li>
                                    <li>Browse by genre, actor and director</li>
                                    <li>
                                        Create and share rankings, comment on them, and take part in
                                        the community forum and polls
                                    </li>
                                    <li>Share collections by link and keep a public profile</li>
                                    <li>Turn on child safety mode, protected by a PIN</li>
                                </ul>
                                <p className="mb-4">
                                    <strong>Important:</strong> NetTrailers is a discovery platform
                                    only. We do not host, stream, or provide access to copyrighted
                                    content. All media information is provided by The Movie Database
                                    (TMDB) API.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    3. User Accounts
                                </h2>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    3.1 Account Creation
                                </h3>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>
                                        You may create an account with an email sign-in link or with
                                        GitHub; there are no passwords
                                    </li>
                                    <li>
                                        You are responsible for maintaining the confidentiality of
                                        your account credentials
                                    </li>
                                    <li>You must provide accurate and complete information</li>
                                    <li>
                                        You are responsible for all activities that occur under your
                                        account
                                    </li>
                                </ul>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    3.2 Guest Access
                                </h3>
                                <p className="mb-4">
                                    You may use our service without creating an account (Guest
                                    Mode). A guest&apos;s lists and settings are kept only in that
                                    browser and are lost if its site data is cleared. Posting
                                    rankings, comments and forum content, sharing collections and
                                    syncing across devices need an account.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    4. Acceptable Use
                                </h2>
                                <p className="mb-4">You agree NOT to use the service to:</p>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>Violate any applicable laws or regulations</li>
                                    <li>Infringe on intellectual property rights</li>
                                    <li>Transmit harmful, offensive, or inappropriate content</li>
                                    <li>Attempt to gain unauthorized access to our systems</li>
                                    <li>Use automated tools to scrape or extract data</li>
                                    <li>Interfere with the normal operation of the service</li>
                                    <li>Impersonate others or provide false information</li>
                                    <li>Distribute malware or harmful code</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    5. Content and Intellectual Property
                                </h2>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    5.1 Third-Party Content
                                </h3>
                                <p className="mb-4">
                                    Movie and TV show data, images, and metadata are provided by The
                                    Movie Database (TMDB). This content is subject to TMDB&apos;s
                                    terms of use and remains the property of their respective
                                    owners.
                                </p>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    5.2 User Content
                                </h3>
                                <p className="mb-4">
                                    You retain ownership of any content you submit (such as
                                    collections, rankings, comments, forum posts and images). By
                                    using our service, you grant us a license to store and display
                                    this content as necessary to provide our services. Rankings,
                                    comments, forum posts, polls and public profiles are visible to
                                    other visitors.
                                </p>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    5.3 Platform Content
                                </h3>
                                <p className="mb-4">
                                    The NetTrailers source code is open source under the MIT License
                                    (see the LICENSE file in the{' '}
                                    <a
                                        href="https://github.com/n8watkins/net_trailers"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-300 hover:text-brand-200 underline"
                                    >
                                        repository
                                    </a>
                                    ). The NetTrailers name and logo are not covered by that
                                    license.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    6. Privacy
                                </h2>
                                <p className="mb-4">
                                    Your privacy is important to us. Please review our{' '}
                                    <Link
                                        href="/privacy"
                                        className="text-brand-300 hover:text-brand-200 underline"
                                    >
                                        Privacy Policy
                                    </Link>
                                    , which also governs your use of the service, to understand our
                                    practices.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    7. Disclaimers and Limitations
                                </h2>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    7.1 Service Availability
                                </h3>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>
                                        We provide the service &quot;as is&quot; without warranties
                                        of any kind
                                    </li>
                                    <li>We do not guarantee uninterrupted or error-free service</li>
                                    <li>We may temporarily suspend the service for maintenance</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    7.2 Content Accuracy
                                </h3>
                                <p className="mb-4">
                                    While we strive to provide accurate information, we cannot
                                    guarantee the accuracy, completeness, or timeliness of movie and
                                    TV show data provided by third-party sources.
                                </p>

                                <h3 className="text-xl font-semibold text-white mb-3">
                                    7.3 Limitation of Liability
                                </h3>
                                <p className="mb-4">
                                    To the maximum extent permitted by law, NetTrailers shall not be
                                    liable for any indirect, incidental, special, or consequential
                                    damages arising from your use of the service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    8. Third-Party Services
                                </h2>
                                <p className="mb-4">
                                    Our service integrates with third-party services:
                                </p>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>
                                        <strong>The Movie Database (TMDB):</strong> Content data and
                                        images
                                    </li>
                                    <li>
                                        <strong>YouTube:</strong> Trailer playback
                                    </li>
                                    <li>
                                        <strong>Cloudflare:</strong> Hosting, email, image storage,
                                        bot protection (Turnstile) and cookieless page counts
                                    </li>
                                    <li>
                                        <strong>Turso:</strong> The account database
                                    </li>
                                    <li>
                                        <strong>Google Gemini:</strong> AI search and suggestions
                                    </li>
                                    <li>
                                        <strong>GitHub:</strong> Optional sign-in
                                    </li>
                                    <li>
                                        <strong>Google Analytics:</strong> Usage analytics, under
                                        the consent rules in the{' '}
                                        <Link
                                            href="/privacy#cookies"
                                            className="text-brand-300 hover:text-brand-200 underline"
                                        >
                                            Privacy Policy
                                        </Link>
                                    </li>
                                    <li>
                                        <strong>Sentry:</strong> Error monitoring
                                    </li>
                                </ul>
                                <p className="mb-4">
                                    Your use of these services is subject to their respective terms
                                    and conditions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    9. Account Termination
                                </h2>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    9.1 By You
                                </h3>
                                <p className="mb-4">
                                    You may delete your account at any time. Upon deletion, your
                                    personal data will be removed according to our Privacy Policy.
                                </p>

                                <h3 className="text-xl font-semibold text-white mb-3">9.2 By Us</h3>
                                <p className="mb-4">
                                    We reserve the right to suspend or terminate accounts that
                                    violate these terms or engage in harmful behavior. We will
                                    provide reasonable notice when possible.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    10. DMCA and Copyright
                                </h2>
                                <p className="mb-4">
                                    We respect intellectual property rights. If you believe your
                                    copyrighted work has been infringed, please contact us with:
                                </p>
                                <ul className="list-disc pl-6 mb-4 space-y-2">
                                    <li>Identification of the copyrighted work</li>
                                    <li>Location of the allegedly infringing material</li>
                                    <li>Your contact information</li>
                                    <li>A statement of good faith belief</li>
                                    <li>A statement of accuracy under penalty of perjury</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    11. Changes to Terms
                                </h2>
                                <p className="mb-4">
                                    We reserve the right to modify these terms at any time. We will
                                    notify users of significant changes by posting the new terms on
                                    this page and updating the &quot;Last updated&quot; date.
                                    Continued use of the service constitutes acceptance of the
                                    modified terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    12. Governing Law
                                </h2>
                                <p className="mb-4">
                                    These terms shall be governed by and construed in accordance
                                    with the laws of the jurisdiction where the service is operated,
                                    without regard to its conflict of law provisions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    13. Contact Information
                                </h2>
                                <p className="mb-4">
                                    If you have any questions about these Terms of Service,
                                    including copyright notices (section 10), please open an issue
                                    on{' '}
                                    <a
                                        href="https://github.com/n8watkins/net_trailers/issues"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-300 hover:text-brand-200 underline"
                                    >
                                        GitHub
                                    </a>
                                    . Issues there are public, so do not include personal details in
                                    one; say that you would like to be contacted and we will reply
                                    there.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">
                                    14. Severability
                                </h2>
                                <p className="mb-4">
                                    If any provision of these terms is found to be unenforceable or
                                    invalid, that provision will be limited or eliminated to the
                                    minimum extent necessary so that the remaining terms will remain
                                    in full force and effect.
                                </p>
                            </section>

                            <div className="bg-gray-800/50 rounded-lg p-6 mt-8">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Important Notes
                                </h3>
                                <div className="text-sm text-gray-400 space-y-2">
                                    <p>
                                        <strong>Discovery Platform:</strong> NetTrailers is for
                                        content discovery only - we do not host or stream movies/TV
                                        shows.
                                    </p>
                                    <p>
                                        <strong>Guest Access:</strong> You can use our service
                                        without creating an account (limited features).
                                    </p>
                                    <p>
                                        <strong>Data Sources:</strong> All content information comes
                                        from The Movie Database (TMDB).
                                    </p>
                                    <p>
                                        <strong>Open Source:</strong> This project is open source
                                        and available on GitHub.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
