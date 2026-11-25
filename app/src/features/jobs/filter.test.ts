import { describe, expect, it } from 'vitest'
import { filterJobs, freshness } from './filter'
import type { Job } from '../../domain/schemas'

const NOW = Date.parse('2026-11-24T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

const job = (id: string, over: Partial<Job> = {}): Job => ({
  id,
  title: 'Software Engineer',
  company: 'Acme',
  location: 'New York, NY',
  remote: 'onsite',
  role: 'Software Engineer',
  payPeriod: 'year',
  currency: 'USD',
  firstSeenAt: daysAgo(1),
  url: '',
  source: 'manual',
  description: '',
  ...over,
})

describe('filterJobs', () => {
  it('compares an hourly contract rate against an annual floor', () => {
    const jobs = [job('hourly', { payMin: 70, payMax: 85, payPeriod: 'hour' }), job('low', { payMin: 90_000, payMax: 110_000 })]
    // $85/h ≈ $176,800/yr clears a $150k floor; a $110k band does not.
    expect(filterJobs(jobs, { minPay: 150_000 }, NOW).map((j) => j.id)).toEqual(['hourly'])
  })

  it('keeps a band whose top meets the floor even when its bottom does not', () => {
    const jobs = [job('band', { payMin: 120_000, payMax: 180_000 })]
    expect(filterJobs(jobs, { minPay: 150_000 }, NOW)).toHaveLength(1)
  })

  it('lets the user choose whether postings without pay survive a pay filter', () => {
    const jobs = [job('nopay'), job('paid', { payMax: 200_000 })]
    expect(filterJobs(jobs, { minPay: 150_000 }, NOW).map((j) => j.id).sort()).toEqual(['nopay', 'paid'])
    expect(filterJobs(jobs, { minPay: 150_000, includeUnknownPay: false }, NOW).map((j) => j.id)).toEqual(['paid'])
  })

  it('matches multi-word title searches regardless of order and case', () => {
    const jobs = [job('a', { title: 'Senior Backend Engineer' }), job('b', { title: 'Backend Intern' })]
    expect(filterJobs(jobs, { text: 'engineer BACKEND' }, NOW).map((j) => j.id)).toEqual(['a'])
  })

  it('matches any of several locations, and filters remote policy', () => {
    const jobs = [
      job('ny', { location: 'New York, NY' }),
      job('phl', { location: 'Philadelphia, PA', remote: 'hybrid' }),
      job('sf', { location: 'San Francisco, CA' }),
    ]
    expect(filterJobs(jobs, { locations: ['philadelphia', 'new york'] }, NOW).map((j) => j.id).sort()).toEqual(['ny', 'phl'])
    expect(filterJobs(jobs, { remote: ['hybrid'] }, NOW).map((j) => j.id)).toEqual(['phl'])
  })

  it('sorts freshest first, using the employer date when present and first-seen otherwise', () => {
    const jobs = [
      // Seen today, but the employer says it was posted 20 days ago: it is NOT fresh.
      job('reposted', { postedAt: daysAgo(20), firstSeenAt: daysAgo(0) }),
      job('fresh', { firstSeenAt: daysAgo(2) }),
      job('week', { postedAt: daysAgo(7), firstSeenAt: daysAgo(7) }),
    ]
    expect(filterJobs(jobs, {}, NOW).map((j) => j.id)).toEqual(['fresh', 'week', 'reposted'])
    expect(filterJobs(jobs, { postedWithinDays: 10 }, NOW).map((j) => j.id)).toEqual(['fresh', 'week'])
  })
})

describe('freshness', () => {
  it('buckets by age', () => {
    expect(freshness(job('a', { firstSeenAt: daysAgo(1) }), NOW)).toBe('new')
    expect(freshness(job('b', { firstSeenAt: daysAgo(6) }), NOW)).toBe('recent')
    expect(freshness(job('c', { firstSeenAt: daysAgo(45) }), NOW)).toBe('stale')
  })
})
