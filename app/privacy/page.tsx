import type { Metadata } from 'next'
import LegalPageShell from '@/components/layout/LegalPageShell'
import { CONSENT_COOKIE } from '@/lib/consent'

export const metadata: Metadata = {
    title: 'Privacy Policy - NetTrailers',
    description:
        'What NetTrailers stores, who receives it, how analytics consent works, and the cookies it uses',
    keywords: ['privacy', 'policy', 'cookies', 'data protection', 'GDPR'],
}

/*
 * Every statement here is meant to be checkable against the code. When the
 * code changes what is stored or who receives it, update this page and the
 * date below (a literal, never the render date).
 */
const LAST_UPDATED = 'November 25, 2026'

const ISSUES_URL = 'https://github.com/n8watkins/net_trailers/issues'

const linkClass = 'text-brand-300 hover:text-brand-200 underline'
const codeClass = 'rounded bg-gray-800/70 px-1 py-0.5 font-mono text-[0.85em] text-gray-200'

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {children}
            <span className="sr-only"> (opens in a new tab)</span>
        </a>
    )
}

function Code({ children }: { children: React.ReactNode }) {
    return <code className={codeClass}>{children}</code>
}

export default function PrivacyPage() {
    return (
        <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
            <div className="prose prose-lg prose-gray max-w-none">
                <div className="space-y-8 text-gray-300">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            1. Who runs NetTrailers
                        </h2>
                        <p className="mb-4">
                            NetTrailers is a portfolio project by Nathan Watkins, part of{' '}
                            <Ext href="https://n8builds.dev">n8builds.dev</Ext>. It runs at
                            net-trailers.n8builds.dev, and its source code is public on{' '}
                            <Ext href="https://github.com/n8watkins/net_trailers">GitHub</Ext>. This
                            page says what the site stores, who receives it, and the choices you
                            have. I do not sell your information and the site shows no ads.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            2. What I collect
                        </h2>

                        <h3 className="text-xl font-semibold text-white mb-3">
                            2.1 Without an account
                        </h3>
                        <p className="mb-4">
                            You can use NetTrailers as a guest. Your lists, likes, hidden titles,
                            watch history and settings are then kept only in your browser&apos;s
                            storage (see section 4) and are not sent to an account.
                        </p>

                        <h3 className="text-xl font-semibold text-white mb-3">
                            2.2 With an account
                        </h3>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>
                                <strong>Sign-in:</strong> your email address. There are no
                                passwords: you sign in with a link sent by email, or with GitHub. If
                                you use GitHub, I receive your GitHub name, profile picture and the
                                primary email address GitHub has verified.
                            </li>
                            <li>
                                <strong>Account records:</strong> when the account was made and when
                                you last signed in.
                            </li>
                            <li>
                                <strong>What you do in the app:</strong> your collections and lists,
                                likes and hidden titles, watch history, settings and notification
                                choices, profile, follows, shared collection links, rankings,
                                comments, forum threads, replies, polls and votes, reports you send,
                                and images you upload.
                            </li>
                            <li>
                                <strong>Recommendation signals:</strong> which titles you open, add,
                                like or hide, which trailers you play and what you search for, to
                                tailor recommendations. Turn this off with &quot;Improve
                                Recommendations&quot; in Settings, Recommendations.
                            </li>
                            <li>
                                <strong>Child safety PIN:</strong> if you set one, only a bcrypt
                                hash of it is stored, never the PIN itself.
                            </li>
                        </ul>
                        <p className="mb-4">
                            Rankings, comments, forum posts, polls and public profiles are visible
                            to other visitors. The rest is visible only to you.
                        </p>

                        <h3 className="text-xl font-semibold text-white mb-3">
                            2.3 Requests and limits
                        </h3>
                        <p className="mb-4">
                            To limit abuse (sign-in emails, AI searches and other requests), the
                            site counts requests per account, or for guests per IP address. For
                            these counters the IP address is turned into a one-way hash (SHA-256);
                            the raw address is not stored. The counters expire on their own.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            3. Who receives data
                        </h2>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>
                                <strong>Cloudflare</strong> hosts the site (Workers), so every
                                request passes through it. It also sends the emails (Cloudflare
                                Email Service), stores uploaded images (R2), checks that a sign-in
                                request comes from a person (Turnstile), and counts page views with
                                Cloudflare Web Analytics, which sets no cookies and keeps no visitor
                                identifier.
                            </li>
                            <li>
                                <strong>Turso</strong> hosts the database that holds accounts and
                                everything listed in section 2.2.
                            </li>
                            <li>
                                <strong>Google Gemini</strong> receives the text you type into the
                                AI features (mood search, AI suggestions, ranking and collection
                                ideas) to turn it into titles. It is sent from the server, without
                                your account or IP address.
                            </li>
                            <li>
                                <strong>The Movie Database (TMDB)</strong> supplies all movie and TV
                                data. Searches reach TMDB through the server. Posters and backdrops
                                load straight from TMDB&apos;s image server, which therefore sees
                                your IP address.
                            </li>
                            <li>
                                <strong>YouTube</strong> plays the trailers, embedded from its
                                privacy-enhanced (no-cookie) host. A trailer loads only after you
                                open a title, and YouTube then receives your IP address and which
                                video plays.
                            </li>
                            <li>
                                <strong>Sentry</strong> receives error reports: what went wrong, on
                                which page, and the browser and device type. The browser reporter
                                does not record sessions, and email and IP addresses are removed
                                from reports.
                            </li>
                            <li>
                                <strong>Google Analytics</strong> receives page views and how the
                                site is used, under the consent rules in section 5. Advertising
                                features are always off.
                            </li>
                            <li>
                                <strong>GitHub</strong> handles the sign-in if you choose to sign in
                                with GitHub.
                            </li>
                        </ul>
                        <p className="mb-4">
                            Voice search uses your browser&apos;s built-in speech recognition. Some
                            browsers (Chrome, for example) send the audio to their maker&apos;s
                            speech service; NetTrailers itself receives only the text.
                        </p>
                    </section>

                    <section id="cookies" className="scroll-mt-24">
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            4. Cookies and browser storage
                        </h2>
                        <h3 className="text-xl font-semibold text-white mb-3">4.1 Cookies</h3>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>
                                <Code>{CONSENT_COOKIE}</Code>: your analytics choice,
                                &quot;granted&quot; or &quot;denied&quot;, for 12 months. It is set
                                on n8builds.dev and its subdomains, so the same choice applies on
                                n8builds.dev, portfolio.n8builds.dev and here. Strictly necessary.
                            </li>
                            <li>
                                <Code>__Secure-authjs.session-token</Code>: keeps you signed in, for
                                up to 30 days. Set only when you sign in. Strictly necessary.
                            </li>
                            <li>
                                <Code>__Secure-authjs.csrf-token</Code> and{' '}
                                <Code>__Secure-authjs.callback-url</Code>: protect the sign-in and
                                return you to the right page afterwards. They last until you close
                                the browser. Strictly necessary.
                            </li>
                            <li>
                                <Code>nettrailer_child_safety</Code>: remembers whether child safety
                                mode is on, for 1 year, so titles stay filtered in this browser
                                after you sign out. Set by the server only when a signed-in account
                                changes that setting. Strictly necessary.
                            </li>
                            <li>
                                <Code>_ga</Code> and <Code>_ga_&lt;id&gt;</Code>: Google Analytics,
                                to tell repeat visits apart, for up to 2 years. They are set on
                                n8builds.dev, shared with the other n8builds.dev sites, and only
                                when analytics is allowed (section 5).
                            </li>
                        </ul>
                        <p className="mb-4">
                            Trailers play in YouTube&apos;s no-cookie player, and the code that
                            starts it is served from this site, so playing a trailer sets no YouTube
                            cookies. Inside its own frame the player keeps a few items in browser
                            storage (local storage and IndexedDB), such as your caption setting.
                        </p>

                        <h3 className="text-xl font-semibold text-white mb-3">
                            4.2 Browser storage
                        </h3>
                        <p className="mb-4">
                            The site keeps some data in your browser&apos;s local storage and
                            session storage. It stays on your device and is not used for tracking:
                        </p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>
                                Guest mode: a random guest id (<Code>nettrailer_guest_id</Code>),
                                your guest lists, likes and settings (
                                <Code>nettrailer_guest_data_v2_&lt;id&gt;</Code>) and guest watch
                                history.
                            </li>
                            <li>
                                Whether you are a guest or signed in (
                                <Code>nettrailer_active_session</Code>), and for signed-in visitors
                                your account id, to load your data faster.
                            </li>
                            <li>
                                Conveniences: recent searches, whether you have seen the welcome and
                                the tour, unsent drafts, and a short-lived copy of the home page
                                data in session storage.
                            </li>
                            <li>
                                A copy of your analytics choice (<Code>n8-analytics-consent</Code>),
                                in case cookies are blocked.
                            </li>
                        </ul>
                        <p className="mb-4">
                            Clearing this site&apos;s data in your browser removes all of it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            5. Analytics and consent
                        </h2>
                        <p className="mb-4">
                            NetTrailers follows the same analytics rules as n8builds.dev:
                        </p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>
                                <strong>In the EEA, the UK, Switzerland and Quebec</strong>,
                                analytics is off until you say yes. If your browser&apos;s time zone
                                is in Europe or covers Quebec (Eastern Canada, so visitors in
                                Ontario are asked too), a banner asks first, and Google Analytics is
                                not loaded at all until you accept; if you decline, it never loads.
                                As a backstop, Google&apos;s Consent Mode also treats visits from
                                these places as &quot;no analytics cookies&quot; unless you have
                                accepted.
                            </li>
                            <li>
                                <strong>Everywhere else</strong>, analytics is on by default, and
                                you can turn it off at any time.
                            </li>
                            <li>
                                <strong>Global Privacy Control:</strong> if your browser sends the{' '}
                                <Ext href="https://globalprivacycontrol.org/">
                                    Global Privacy Control
                                </Ext>{' '}
                                signal, wherever you are, it counts as a decline, unless you turn
                                analytics on yourself.
                            </li>
                        </ul>
                        <p className="mb-4">
                            To change your choice, use &quot;Cookie settings&quot; in the footer of
                            any page. Declining removes the Google Analytics cookies already set. A
                            choice made on n8builds.dev or portfolio.n8builds.dev applies here too,
                            and the other way round.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">6. Your choices</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Export:</strong> download your watchlist, likes and hidden
                                titles as a CSV file from Settings.
                            </li>
                            <li>
                                <strong>Delete your account:</strong> in Settings, Account. This
                                deletes your account and everything listed in section 2.2 straight
                                away, including the images you uploaded. If the images cannot be
                                deleted, the account is kept, so you can try again.
                            </li>
                            <li>
                                <strong>Emails:</strong> sign-in emails are sent only when you ask
                                for one. Other emails (such as reply notifications and digests)
                                follow your notification settings and carry an unsubscribe link.
                            </li>
                            <li>
                                <strong>Guest data:</strong> clear it from Settings or by clearing
                                this site&apos;s data in your browser.
                            </li>
                            <li>
                                <strong>Analytics:</strong> &quot;Cookie settings&quot; in the
                                footer (section 5).
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">
                            7. Changes to this policy
                        </h2>
                        <p className="mb-4">
                            When what the site stores or who receives it changes, this page is
                            updated along with the &quot;Last updated&quot; date at the top.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">8. Contact</h2>
                        <p className="mb-4">
                            Questions or requests about your data: open an issue on{' '}
                            <Ext href={ISSUES_URL}>GitHub</Ext>. Issues there are public, so do not
                            include personal details in one; say that you would like to be contacted
                            and I will reply there.
                        </p>
                    </section>
                </div>
            </div>
        </LegalPageShell>
    )
}
