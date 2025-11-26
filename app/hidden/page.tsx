import { redirect } from 'next/navigation'

export default function HiddenPage() {
    redirect('/ratings?filter=disliked')
}
