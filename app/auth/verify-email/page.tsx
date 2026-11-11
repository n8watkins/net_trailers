import { redirect } from 'next/navigation'

/**
 * Email verification is no longer supported - sign-in is by emailed link (Auth.js).
 * Redirect users to the home page instead of showing a broken form.
 */
export default function VerifyEmailPage() {
    redirect('/')
}
