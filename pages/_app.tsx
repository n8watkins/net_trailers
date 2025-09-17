import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import { RecoilRoot } from 'recoil'
import ErrorToast from '../components/ErrorToast'
import DemoMessage from '../components/DemoMessage'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <AuthProvider>
                <Component {...pageProps} />
                <ErrorToast />
                <DemoMessage />
            </AuthProvider>
        </RecoilRoot>
    )
}

export default MyApp
