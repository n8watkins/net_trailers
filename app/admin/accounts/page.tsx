import { redirect } from 'next/navigation'

// Moved: accounts are the Users section now.
export default function AccountsPage() {
    redirect('/admin/users')
}
