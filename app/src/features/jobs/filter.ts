// Job filtering and recency — ADR-0003.
import type { Job, RemotePolicy } from '../../domain/schemas'

/** Standard full-time year: 52 weeks × 40 hours. Used only to compare hourly against salaried. */
export const HOURS_PER_YEAR = 2080

export interface JobFilter {
  /** Matched against title and company, case-insensitive, all words must appear. */
  text?: string
  roles?: string[]
  /** Annualized minimum the user will accept. */
  minPay?: number
  /** Postings that don't state pay. Default true: most postings outside pay-transparency states omit it. */
  includeUnknownPay?: boolean
  /** Substring match against location, any of. */
  locations?: string[]
  remote?: RemotePolicy[]
  postedWithinDays?: number
}

/** When the job became visible: the employer's date if given, else when we first saw it. */
export function postedTime(job: Job): number {
  return Date.parse(job.postedAt ?? job.firstSeenAt)
}

export function ageInDays(job: Job, now: number = Date.now()): number {
  return Math.max(0, (now - postedTime(job)) / 86_400_000)
}

/** Best annual figure the posting supports: the top of the band, annualized. */
export function annualPayCeiling(job: Job): number | undefined {
  const top = job.payMax ?? job.payMin
  if (top === undefined) return undefined
  return job.payPeriod === 'hour' ? top * HOURS_PER_YEAR : top
}

export function filterJobs(jobs: Job[], f: JobFilter, now: number = Date.now()): Job[] {
  const words = (f.text ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const roles = (f.roles ?? []).map((r) => r.toLowerCase())
  const locs = (f.locations ?? []).map((l) => l.toLowerCase()).filter(Boolean)
  const includeUnknownPay = f.includeUnknownPay ?? true

  return jobs
    .filter((j) => {
      if (words.length) {
        const hay = `${j.title} ${j.company}`.toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      if (roles.length && !roles.includes(j.role.toLowerCase())) return false
      if (f.minPay !== undefined) {
        const pay = annualPayCeiling(j)
        // Compare against the TOP of the band: a $120–180k posting can still meet a $150k floor.
        if (pay === undefined ? !includeUnknownPay : pay < f.minPay) return false
      }
      if (locs.length) {
        const loc = j.location.toLowerCase()
        if (!locs.some((l) => loc.includes(l))) return false
      }
      if (f.remote?.length && !f.remote.includes(j.remote)) return false
      if (f.postedWithinDays !== undefined && ageInDays(j, now) > f.postedWithinDays) return false
      return true
    })
    .sort((a, b) => postedTime(b) - postedTime(a))
}

export type Freshness = 'new' | 'recent' | 'aging' | 'stale'

/** Buckets for the UI badge. Thresholds are a first guess, open in ADR-0003 (QST-FRESHNESS). */
export function freshness(job: Job, now: number = Date.now()): Freshness {
  const d = ageInDays(job, now)
  if (d <= 3) return 'new'
  if (d <= 10) return 'recent'
  if (d <= 30) return 'aging'
  return 'stale'
}
