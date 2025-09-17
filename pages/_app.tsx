import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../hooks/useAuth'
import { RecoilRoot } from 'recoil'
import ErrorToast from '../components/ErrorToast'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <AuthProvider>
                <Component {...pageProps} />
                <ErrorToast />
            </AuthProvider>
        </RecoilRoot>
    )
}

export default MyApp
