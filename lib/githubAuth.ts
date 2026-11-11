/**
 * GitHub sign-in as an extra option for visitors (auth.ts registers it only
 * when AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are set, lib/authConfig.ts).
 *
 * Account linking: a GitHub sign-in whose primary email is VERIFIED by GitHub
 * lands on the existing account with that email (allowDangerousEmailAccountLinking
 * in auth.ts), so the owner's email account and GitHub sign-in are one user.
 * The trade-off: linking trusts GitHub to have verified the address. That is
 * safe only because we never accept an unverified address: the profile carries
 * the email only when GitHub marks it primary and verified, and a GitHub
 * sign-in without one is refused (isGitHubSignInAllowed). Auth.js's own
 * default takes the first listed email without checking `verified`, hence the
 * explicit check here.
 *
 * Admin is never granted by GitHub username: only ADMIN_EMAILS (lib/admin.ts)
 * counts, and only through the account's email.
 */

export interface GitHubEmail {
    email: string
    primary?: boolean
    verified?: boolean
}

/** The primary email GitHub has verified, lower-cased, or null. */
export function verifiedPrimaryEmail(emails: unknown): string | null {
    if (!Array.isArray(emails)) return null
    const hit = (emails as GitHubEmail[]).find(
        (e) => e && e.primary === true && e.verified === true && typeof e.email === 'string'
    )
    return hit ? hit.email.trim().toLowerCase() : null
}

interface GitHubProfile {
    id: number | string
    name?: string | null
    login?: string
    email?: string | null
    avatar_url?: string | null
}

/**
 * Auth.js user from a GitHub profile. The email is the verified primary one
 * from /user/emails (needs the user:email scope), never the free-text profile
 * email, which GitHub does not verify.
 */
export async function githubUser(
    profile: GitHubProfile,
    accessToken: string | undefined,
    fetchImpl: typeof fetch = fetch
) {
    let email: string | null = null
    if (accessToken) {
        const res = await fetchImpl('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'net-trailers',
            },
        })
        if (res.ok) email = verifiedPrimaryEmail(await res.json())
    }
    return {
        id: String(profile.id),
        name: profile.name ?? profile.login ?? null,
        email,
        image: profile.avatar_url ?? null,
    }
}

/** A GitHub sign-in needs a verified email; anything else is refused. */
export function isGitHubSignInAllowed(
    provider: string | undefined,
    email: string | null | undefined
) {
    return provider !== 'github' || Boolean(email)
}
