import { majorOf, stackVersionsFrom } from '../../lib/stackVersions'
import { readStackVersions } from '../../constants/aboutContent'
import pkg from '../../package.json'

describe('stack versions for the About dialog', () => {
    it('takes the major from a semver range', () => {
        expect(majorOf('^16.4.3')).toBe('16')
        expect(majorOf('5.0.0-beta.32')).toBe('5')
        expect(majorOf('latest')).toBeNull()
        expect(majorOf(undefined)).toBeNull()
    })

    it('reads the headline packages from package.json, not hard-coded numbers', () => {
        const versions = stackVersionsFrom(pkg)
        expect(versions.next).toBe(majorOf(pkg.dependencies.next))
        expect(versions.react).toBe(majorOf(pkg.dependencies.react))
        expect(versions.tailwind).toBe(majorOf(pkg.devDependencies.tailwindcss))
        expect(versions.typescript).toBeTruthy()
    })

    it('parses the build-time env value and tolerates a missing or bad one', () => {
        expect(readStackVersions('{"next":"16"}')).toEqual({ next: '16' })
        expect(readStackVersions(undefined)).toEqual({})
        expect(readStackVersions('not json')).toEqual({})
    })
})
