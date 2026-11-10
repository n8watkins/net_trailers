/**
 * The email sign-in link, as HTML and plain text. Kept as a plain string
 * (not React) so it stays small and renders the same everywhere.
 */

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

export function signInEmail(url: string): { subject: string; html: string; text: string } {
    const href = escapeHtml(url)
    const html = `<!doctype html><html><body style="margin:0;background:#0b0b0b;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e5e5e5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#181818;border:1px solid #333;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 28px">
<p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff">Sign in to NetTrailers</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#bdbdbd">Tap the button to sign in. The link works once and expires in 24 hours.</p>
<a href="${href}" style="display:inline-block;background:#f59e0b;color:#18181b;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">Sign in</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#9a9a9a">Open the link in the browser where you want to be signed in (Safari or Chrome), not inside an email app's preview.</p>
<p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#9a9a9a">If you didn't ask for this, ignore it: nobody can sign in without the link.</p>
</td></tr></table></td></tr></table></body></html>`
    const text = [
        'Sign in to NetTrailers with this link. It works once and expires in 24 hours.',
        '',
        url,
        '',
        'Open it in the browser where you want to be signed in.',
        "If you didn't ask for it, ignore this email: nobody can sign in without the link.",
    ].join('\n')
    return { subject: 'Your NetTrailers sign-in link', html, text }
}
