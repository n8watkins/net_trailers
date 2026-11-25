import ConsentLoader from '@/components/consent/ConsentLoader'
import { consentBootstrapScript } from '@/lib/consent'

/**
 * Google Analytics behind the n8builds.dev consent rules (lib/consent.ts).
 * The measurement ID is set at build time (the deploy workflow); builds
 * without it load nothing and show no banner.
 */
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * The consent bootstrap, for the root layout's <head>: Consent Mode defaults,
 * the visitor's stored choice, and the GA loader. `nonce` is the request's
 * CSP script nonce (lib/csp.ts).
 */
export function AnalyticsBootstrap({ nonce }: { nonce?: string }) {
    if (!gaId) return null
    return (
        <script
            id="consent-bootstrap"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: consentBootstrapScript(gaId) }}
        />
    )
}

/**
 * Asks visitors in European and Quebec time zones before analytics; the
 * banner itself is downloaded only when it is shown.
 */
export default function Analytics() {
    if (!gaId) return null
    return <ConsentLoader />
}
