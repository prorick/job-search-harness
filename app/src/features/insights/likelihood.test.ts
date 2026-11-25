import { describe, expect, it } from 'vitest'
import { PRIOR_RATE, betaEstimate, estimateResponse } from './likelihood'
import type { Application } from '../../domain/schemas'

const app = (i: number, status: Application['status'], over: Partial<Application> = {}): Application => ({
  id: String(i),
  company: `Co${i}`,
  title: 'SWE',
  location: '',
  url: '',
  appliedAt: '2026-11-01T00:00:00.000Z',
  status,
  history: [],
  referral: false,
  notes: '',
  ...over,
})

describe('response likelihood', () => {
  it('with no history, says the prior and admits a wide interval', () => {
    const e = betaEstimate(0, 0)
    expect(e.rate).toBeCloseTo(PRIOR_RATE)
    expect(e.high - e.low).toBeGreaterThan(0.1)
  })

  it('does not swing to 100% after one lucky response', () => {
    expect(betaEstimate(1, 1).rate).toBeLessThan(0.25)
  })

  it('learns that referrals work for this user when the data says so', () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => app(i, 'interview', { referral: true })),
      ...Array.from({ length: 20 }, (_, i) => app(100 + i, 'rejected', { referral: false })),
    ]
    const withRef = estimateResponse(history, { referral: true })
    const cold = estimateResponse(history, { referral: false })
    expect(withRef.basis).toBe('comparable')
    expect(withRef.rate).toBeGreaterThan(cold.rate * 3)
  })
})
