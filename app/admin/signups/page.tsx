import { redirect } from 'next/navigation'

// Moved: sign-ups are a tab under Activity now.
export default function SignupsPage() {
    redirect('/admin/activity/signups')
}
