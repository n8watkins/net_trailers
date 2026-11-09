import { redirect } from 'next/navigation'

// next.config.js redirects /settings before it reaches this page; this is a
// fallback for in-app navigation to /settings.
export default function SettingsPage() {
    redirect('/settings/preferences')
}
