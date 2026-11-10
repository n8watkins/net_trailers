/**
 * Which sign-in providers are available, from the server's environment.
 */

/** True when the GitHub OAuth App credentials are set (both id and secret). */
export function isGitHubAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env.AUTH_GITHUB_ID?.trim() && env.AUTH_GITHUB_SECRET?.trim())
}
