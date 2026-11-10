import { isGitHubAuthConfigured } from '../../lib/authConfig'

describe('isGitHubAuthConfigured', () => {
    it('is off when either GitHub credential is missing or blank', () => {
        expect(isGitHubAuthConfigured({} as NodeJS.ProcessEnv)).toBe(false)
        expect(isGitHubAuthConfigured({ AUTH_GITHUB_ID: 'id' } as NodeJS.ProcessEnv)).toBe(false)
        expect(
            isGitHubAuthConfigured({
                AUTH_GITHUB_ID: 'id',
                AUTH_GITHUB_SECRET: ' ',
            } as NodeJS.ProcessEnv)
        ).toBe(false)
    })

    it('is on when both credentials are set', () => {
        expect(
            isGitHubAuthConfigured({
                AUTH_GITHUB_ID: 'id',
                AUTH_GITHUB_SECRET: 'secret',
            } as NodeJS.ProcessEnv)
        ).toBe(true)
    })
})
