// Response-likelihood estimate — ADR-0007.
//
// Deliberately simple and deliberately honest about sample size. With a few dozen applications,
// any fancier model would mostly be fitting noise. We use a Beta-Binomial with a weak prior:
// start from a base response rate (a prior worth PRIOR_STRENGTH pseudo-applications), and let
// the user's own outcomes in a comparable bucket pull the estimate away from it.
import type { Application } from '../../domain/schemas'
import { gotResponse } from '../tracker/tracker'

/** Prior response rate for cold online applications. A placeholder — see ADR-0007 QST-PRIOR. */
export const PRIOR_RATE = 0.08
export const PRIOR_STRENGTH = 10

export interface Estimate {
  rate: number
  low: number
  high: number
  /** How many of the user's own applications informed this estimate. */
  n: number
  responses: number
}

/** Beta posterior mean with an approximate 80% interval (normal approximation, clamped). */
export function betaEstimate(responses: number, n: number, prior = PRIOR_RATE, strength = PRIOR_STRENGTH): Estimate {
  const a = prior * strength + responses
  const b = (1 - prior) * strength + (n - responses)
  const mean = a / (a + b)
  const sd = Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)))
  const z = 1.2816 // 80%
  return { rate: mean, low: Math.max(0, mean - z * sd), high: Math.min(1, mean + z * sd), n, responses }
}

export interface Candidate {
  matchScore?: number
  daysSincePosted?: number
  referral?: boolean
}

/**
 * Comparable = same referral status, match score within ±15, applied within a similar posting
 * age bucket. Falls back to the user's overall rate (then the prior) when the bucket is thin.
 */
export function estimateResponse(history: Application[], c: Candidate): Estimate & { basis: 'comparable' | 'overall' } {
  const decided = history.filter((a) => a.status !== 'saved')
  const comparable = decided.filter(
    (a) =>
      a.referral === (c.referral ?? false) &&
      (c.matchScore === undefined || a.matchScore === undefined || Math.abs(a.matchScore - c.matchScore) <= 15) &&
      (c.daysSincePosted === undefined || a.daysSincePosted === undefined || ageBucket(a.daysSincePosted) === ageBucket(c.daysSincePosted)),
  )
  const pool = comparable.length >= 5 ? comparable : decided
  const responses = pool.filter(gotResponse).length
  return { ...betaEstimate(responses, pool.length), basis: comparable.length >= 5 ? 'comparable' : 'overall' }
}

function ageBucket(days: number): number {
  return days <= 3 ? 0 : days <= 10 ? 1 : days <= 30 ? 2 : 3
}
