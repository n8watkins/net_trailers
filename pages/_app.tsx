import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import DemoMessage from '../components/auth/DemoMessage'
import ErrorBoundary from '../components/common/ErrorBoundary'
import GoogleAnalytics from '../components/utility/Analytics'
import VercelAnalyticsWrapper from '../components/utility/VercelAnalyticsWrapper'
import ToastManager from '../components/common/ToastManager'
import Layout from '../components/layout/Layout'
import Modal from '../components/modals/Modal'
import ListSelectionModal from '../components/modals/ListSelectionModal'
import { SessionSyncManager } from '../components/utility/SessionSyncManager'
import { reportWebVitals as reportWebVitalsUtil } from '../utils/performance'
import { suppressHMRLog } from '../utils/suppressHMRLog'
import { useEffect } from 'react'

// Dynamic imports for debug components - only loads in development
// This prevents them from being included in the production bundle
const AuthFlowDebugger = dynamic(() => import('../components/auth/AuthFlowDebugger'), {
    ssr: false,
    loading: () => null,
})
const DebugControls = dynamic(() => import('../components/debug/DebugControls'), {
    ssr: false,
    loading: () => null,
})
const FirebaseCallTracker = dynamic(() => import('../components/debug/FirebaseCallTracker'), {
    ssr: false,
    loading: () => null,
})
const FirestoreTestButton = dynamic(() => import('../components/debug/FirestoreTestButton'), {
    ssr: false,
    loading: () => null,
})
const WebVitalsHUD = dynamic(() => import('../components/debug/WebVitalsHUD'), {
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
