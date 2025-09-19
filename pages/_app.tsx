import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import { RecoilRoot } from 'recoil'
import ErrorToast from '../components/ErrorToast'
import DemoMessage from '../components/DemoMessage'
import ErrorBoundary from '../components/ErrorBoundary'
import GoogleAnalytics from '../components/Analytics'
import { Analytics } from '@vercel/analytics/next'
import ToastManager from '../components/ToastManager'
import Layout from '../components/Layout'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <AuthProvider>
                <ErrorBoundary>
                    <Layout>
                        <Component {...pageProps} />
                    </Layout>
                    <ErrorToast />
                    <DemoMessage />
                    <ToastManager />
                    <GoogleAnalytics />
                    <Analytics />
                </ErrorBoundary>
            </AuthProvider>
        </RecoilRoot>
    )
}

export default MyApp
