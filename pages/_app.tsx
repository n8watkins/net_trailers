import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import DemoMessage from '../components/DemoMessage'
import ErrorBoundary from '../components/ErrorBoundary'
import GoogleAnalytics from '../components/Analytics'
import VercelAnalyticsWrapper from '../components/VercelAnalyticsWrapper'
import ToastManager from '../components/ToastManager'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ListSelectionModal from '../components/ListSelectionModal'
import { SessionSyncManager } from '../components/SessionSyncManager'
import { reportWebVitals as reportWebVitalsUtil } from '../utils/performance'
import { suppressHMRLog } from '../utils/suppressHMRLog'
import { useEffect } from 'react'

// Dynamic imports for debug components - only loads in development
// This prevents them from being included in the production bundle
const AuthFlowDebugger = dynamic(() => import('../components/AuthFlowDebugger'), {
    ssr: false,
    loading: () => null,
})
const DebugControls = dynamic(() => import('../components/DebugControls'), {
    ssr: false,
    loading: () => null,
})
const FirebaseCallTracker = dynamic(() => import('../components/FirebaseCallTracker'), {
    ssr: false,
    loading: () => null,
})
const FirestoreTestButton = dynamic(() => import('../components/FirestoreTestButton'), {
    ssr: false,
    loading: () => null,
})
const WebVitalsHUD = dynamic(() => import('../components/WebVitalsHUD'), {
    ssr: false,
    loading: () => null,
})

function MyApp({ Component, pageProps }: AppProps) {
    // Suppress HMR connected log in development
    useEffect(() => {
        suppressHMRLog()
    }, [])

    const isDevelopment = process.env.NODE_ENV === 'development'

    return (
        <AuthProvider>
            <ErrorBoundary>
                <SessionSyncManager />
                <Layout>
                    <Component {...pageProps} />
                </Layout>
                <Modal />
                <DemoMessage />
                <ToastManager />
                <ListSelectionModal />
                {/* Debug components - only loaded in development */}
                {isDevelopment && (
                    <>
                        <DebugControls />
                        <FirebaseCallTracker />
                        <AuthFlowDebugger />
                        <FirestoreTestButton />
                        <WebVitalsHUD />
                    </>
                )}
                <GoogleAnalytics />
                <VercelAnalyticsWrapper />
            </ErrorBoundary>
        </AuthProvider>
    )
}

// Report Web Vitals (development only)
// Logs performance metrics to console with color-coding
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reportWebVitals(metric: any) {
    reportWebVitalsUtil(metric)
}

export default MyApp
