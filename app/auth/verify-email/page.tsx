import { redirect } from 'next/navigation'

/**
 * Email verification is no longer supported — auth is GitHub-only via Auth.js.
 * Redirect users to the home page instead of showing a broken form.
 */
export default function VerifyEmailPage() {
    redirect('/')
}
