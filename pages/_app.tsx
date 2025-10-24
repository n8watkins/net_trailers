import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import { RecoilRoot } from 'recoil'
import DemoMessage from '../components/DemoMessage'
import ErrorBoundary from '../components/ErrorBoundary'
import GoogleAnalytics from '../components/Analytics'
import { Analytics } from '@vercel/analytics/next'
import ToastManager from '../components/ToastManager'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ListSelectionModal from '../components/ListSelectionModal'
import DebugControls from '../components/DebugControls'
import FirebaseCallTracker from '../components/FirebaseCallTracker'
import AuthFlowDebugger from '../components/AuthFlowDebugger'
import FirestoreTestButton from '../components/FirestoreTestButton'
import { SessionSyncManager } from '../components/SessionSyncManager'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
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
                    <GoogleAnalytics />
                    <Analytics />
                </ErrorBoundary>
            </AuthProvider>
        </RecoilRoot>
    )
}

export default MyApp
