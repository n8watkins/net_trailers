import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import { RecoilRoot } from 'recoil'
import ErrorToast from '../components/ErrorToast'
import DemoMessage from '../components/DemoMessage'
import ErrorBoundary from '../components/ErrorBoundary'
import Analytics from '../components/Analytics'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <AuthProvider>
                <ErrorBoundary>
                    <Component {...pageProps} />
                    <ErrorToast />
                    <DemoMessage />
                    <Analytics />
                </ErrorBoundary>
            </AuthProvider>
        </RecoilRoot>
    )
}

export default MyApp
