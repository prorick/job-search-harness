// Domain schemas — the single source of truth for every record the harness stores.
// Zod validates on every read from storage (ADR-0001): browser storage is user-editable
// and survives app upgrades, so nothing read back is trusted until it parses.
import { z } from 'zod'

export const RemotePolicy = z.enum(['onsite', 'hybrid', 'remote', 'unknown'])
export type RemotePolicy = z.infer<typeof RemotePolicy>

export const PayPeriod = z.enum(['year', 'hour'])

export const Job = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().default(''),
  remote: RemotePolicy.default('unknown'),
  /** Free-form role family the user filters on, e.g. "Software Engineer", "Data". */
  role: z.string().default(''),
  payMin: z.number().nonnegative().optional(),
  payMax: z.number().nonnegative().optional(),
  payPeriod: PayPeriod.default('year'),
  currency: z.string().default('USD'),
  /** When the employer says it was posted (ISO). Often missing or stale on aggregators. */
  postedAt: z.iso.datetime({ offset: true }).optional(),
  /** When the harness first saw it (ISO). The fallback clock for recency — ADR-0003. */
  firstSeenAt: z.iso.datetime({ offset: true }),
  url: z.string().default(''),
  source: z.string().default('manual'),
  description: z.string().default(''),
})
export type Job = z.infer<typeof Job>

export const ApplicationStatus = z.enum([
  'saved',
  'applied',
  'screen',
  'interview',
  'offer',
  'rejected',
  'ghosted',
  'withdrawn',
])
export type ApplicationStatus = z.infer<typeof ApplicationStatus>

export const StatusEvent = z.object({
  status: ApplicationStatus,
  at: z.iso.datetime({ offset: true }),
  /** Where the transition came from: a click in the tracker, or a parsed email (ADR-0006). */
  via: z.enum(['manual', 'email', 'import']).default('manual'),
  note: z.string().optional(),
})
export type StatusEvent = z.infer<typeof StatusEvent>

export const Application = z.object({
  id: z.string().min(1),
  jobId: z.string().optional(),
  // Denormalized on purpose: the tracker must survive the job record being deleted.
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().default(''),
  url: z.string().default(''),
  appliedAt: z.iso.datetime({ offset: true }),
  status: ApplicationStatus,
  history: z.array(StatusEvent).default([]),
  resumeId: z.string().optional(),
  /** Résumé↔JD match score at the moment of applying — a feature for ADR-0007's analysis. */
  matchScore: z.number().min(0).max(100).optional(),
  /** Days between posting and applying — the "apply early" signal from ADR-0003. */
  daysSincePosted: z.number().nonnegative().optional(),
  referral: z.boolean().default(false),
  notes: z.string().default(''),
})
export type Application = z.infer<typeof Application>

const DateRange = {
  start: z.string().default(''), // free text "2023-06" or "Jun 2023" — résumés vary
  end: z.string().default(''), // "" means present
}

export const Resume = z.object({
  id: z.string().min(1),
  label: z.string().default('Main résumé'),
  updatedAt: z.iso.datetime({ offset: true }),
  basics: z.object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    location: z.string().default(''),
    links: z.array(z.string()).default([]),
  }),
  summary: z.string().default(''),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string().default(''),
        ...DateRange,
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().default(''),
        ...DateRange,
        details: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().default(''),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })).default([]),
})
export type Resume = z.infer<typeof Resume>

export const newId = (): string => crypto.randomUUID()
export const nowIso = (): string => new Date().toISOString()
