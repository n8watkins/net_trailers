import { GoogleAnalytics } from '@next/third-parties/google'

/** Google Analytics; `nonce` is the request's CSP script nonce (lib/csp.ts). */
export default function Analytics({ nonce }: { nonce?: string }) {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

    if (!gaId) {
        return null
    }

    return <GoogleAnalytics gaId={gaId} nonce={nonce} />
}
