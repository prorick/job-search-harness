// Application tracker logic — ADR-0006. Pure functions; the UI and storage stay thin.
import type { Application, ApplicationStatus, StatusEvent } from '../../domain/schemas'

/** Statuses that mean the company answered — what ADR-0007 calls a "response". */
export const RESPONDED: ReadonlySet<ApplicationStatus> = new Set(['screen', 'interview', 'offer'])

/** Ordinal for "furthest stage reached"; rejected/ghosted/withdrawn are terminal, not stages. */
const STAGE_ORDER: Partial<Record<ApplicationStatus, number>> = {
  saved: 0,
  applied: 1,
  screen: 2,
  interview: 3,
  offer: 4,
}

export function setStatus(
  app: Application,
  status: ApplicationStatus,
  via: StatusEvent['via'] = 'manual',
  at: string = new Date().toISOString(),
  note?: string,
): Application {
  if (app.status === status) return app
  return { ...app, status, history: [...app.history, { status, at, via, note }] }
}

/** The furthest pipeline stage this application ever reached, read from its history. */
export function furthestStage(app: Application): ApplicationStatus {
  let best: ApplicationStatus = 'applied'
  for (const s of [app.status, ...app.history.map((h) => h.status)]) {
    const o = STAGE_ORDER[s]
    if (o !== undefined && o > (STAGE_ORDER[best] ?? 0)) best = s
  }
  return best
}

export function gotResponse(app: Application): boolean {
  return RESPONDED.has(furthestStage(app))
}

export interface FunnelLink {
  source: string
  target: string
  value: number
}

/**
 * Applied → (furthest stage) → outcome, for the Sankey chart.
 * A rejection after an interview counts in BOTH the interview node and the rejected node — the
 * chart should show how far people got, not just how it ended.
 */
export function funnel(apps: Application[]): FunnelLink[] {
  const counts = new Map<string, number>()
  const bump = (s: string, t: string) => counts.set(`${s}→${t}`, (counts.get(`${s}→${t}`) ?? 0) + 1)
  for (const a of apps) {
    if (a.status === 'saved') continue
    const stage = furthestStage(a)
    const path: string[] = ['applied']
    if ((STAGE_ORDER[stage] ?? 0) >= 2) path.push('screen')
    if ((STAGE_ORDER[stage] ?? 0) >= 3) path.push('interview')
    if (stage === 'offer') path.push('offer')
    const terminal = a.status === 'rejected' || a.status === 'ghosted' || a.status === 'withdrawn' ? a.status : null
    if (terminal) path.push(terminal)
    else if (path.length === 1) path.push('awaiting')
    for (let i = 0; i + 1 < path.length; i++) bump(path[i], path[i + 1])
  }
  return [...counts.entries()].map(([k, value]) => {
    const [source, target] = k.split('→')
    return { source, target, value }
  })
}

/** CSV for the "spreadsheet" view — opens in Excel / Sheets / Numbers. RFC 4180 quoting. */
export function toCsv(apps: Application[]): string {
  const cols = ['company', 'title', 'location', 'status', 'appliedAt', 'matchScore', 'daysSincePosted', 'referral', 'url', 'notes'] as const
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...apps.map((a) => cols.map((c) => esc(a[c])).join(','))].join('\r\n')
}
