import type { AppProps } from 'next/app'
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
import DebugControls from '../components/DebugControls'
import FirebaseCallTracker from '../components/FirebaseCallTracker'
import AuthFlowDebugger from '../components/AuthFlowDebugger'
import FirestoreTestButton from '../components/FirestoreTestButton'
import { SessionSyncManager } from '../components/SessionSyncManager'
import WebVitalsHUD from '../components/WebVitalsHUD'
import { reportWebVitals as reportWebVitalsUtil } from '../utils/performance'
import { suppressHMRLog } from '../utils/suppressHMRLog'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }: AppProps) {
    // Suppress HMR connected log in development
    useEffect(() => {
        suppressHMRLog()
    }, [])
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
                <DebugControls />
                <FirebaseCallTracker />
                <AuthFlowDebugger />
                <FirestoreTestButton />
                <WebVitalsHUD />
                <GoogleAnalytics />
                <VercelAnalyticsWrapper />
            </ErrorBoundary>
        </AuthProvider>
    )
}

// Report Web Vitals (development only)
// Logs performance metrics to console with color-coding
export function reportWebVitals(metric: any) {
    reportWebVitalsUtil(metric)
}

export default MyApp
