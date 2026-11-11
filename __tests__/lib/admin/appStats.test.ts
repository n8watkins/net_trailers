/**
 * @jest-environment node
 */

jest.mock('@/db', () => ({ db: {} }))
jest.mock('@/lib/email/gate', () => ({ getEmailUsage: jest.fn() }))
jest.mock('@/lib/jobs', () => ({ JOB_NAMES: [], JOBS: {}, lastRuns: jest.fn() }))

import { jobStatus, statsTone } from '@/lib/admin/appStats'

const run = (ok: boolean | null, finishedAt: number | null = 1) => ({
    trigger: 'cron',
    scope: 'all',
    startedAt: 0,
    finishedAt,
    ok,
    summary: null,
})

describe('the stats for admin.n8builds.dev (lib/admin/appStats.ts)', () => {
    it('reads a job run as ok, failed, running or never', () => {
        expect(jobStatus(null)).toBe('never')
        expect(jobStatus(run(true))).toBe('ok')
        expect(jobStatus(run(false))).toBe('failed')
        expect(jobStatus(run(null, null))).toBe('running')
        // Finished without recording ok: treat as failed
        expect(jobStatus(run(null, 5))).toBe('failed')
    })

    it('turns the tile bad for a failed job or a reached cap, amber for errors or 70%', () => {
        const job = (status: 'ok' | 'failed') => ({
            key: 'x',
            label: 'X',
            schedule: '',
            lastRunAt: null,
            status,
        })
        const quota = (used: number) => ({
            key: 'm',
            label: 'M',
            used,
            limit: 100,
            period: 'month' as const,
        })
        const errors = (count: number) => ({ count, windowHours: 24 })
        expect(statsTone({ jobs: [job('ok')], quotas: [quota(10)], errors: errors(0) })).toBe(
            'quiet'
        )
        expect(statsTone({ jobs: [job('failed')], quotas: [quota(10)], errors: errors(0) })).toBe(
            'bad'
        )
        expect(statsTone({ jobs: [job('ok')], quotas: [quota(100)], errors: errors(0) })).toBe(
            'bad'
        )
        expect(statsTone({ jobs: [job('ok')], quotas: [quota(70)], errors: errors(0) })).toBe(
            'warn'
        )
        expect(statsTone({ jobs: [job('ok')], quotas: [quota(10)], errors: errors(1) })).toBe(
            'warn'
        )
    })
})
