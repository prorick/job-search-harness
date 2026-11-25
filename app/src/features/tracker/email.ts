// Email → tracker update suggestions — ADR-0006.
//
// Phase 1: the user pastes an email (or, later, an inbox connector feeds one in) and we SUGGEST
// a status change. We never apply it silently — a misread "unfortunately" must not mark a live
// application as rejected. The user confirms each suggestion.
import type { Application, ApplicationStatus } from '../../domain/schemas'

interface Rule {
  status: ApplicationStatus
  patterns: RegExp[]
}

// Order matters: an offer email often also says "interview"; a rejection often thanks you for
// interviewing. Most-decisive first.
const RULES: Rule[] = [
  {
    status: 'offer',
    patterns: [/\boffer letter\b/i, /\bpleased to (?:extend|offer)\b/i, /\bextend (?:you )?an offer\b/i],
  },
  {
    status: 'rejected',
    patterns: [
      /\bunfortunately\b/i,
      /\bnot (?:to )?(?:move|moving) forward\b/i,
      /\bdecided to (?:pursue|proceed with) other candidates\b/i,
      /\bposition has been filled\b/i,
      /\bwill not be (?:moving|proceeding)\b/i,
      /\bregret to inform\b/i,
    ],
  },
  {
    status: 'interview',
    patterns: [/\b(?:onsite|on-site|final round|technical interview|interview loop|virtual onsite)\b/i, /\bnext round\b/i],
  },
  {
    status: 'screen',
    patterns: [
      /\b(?:phone|recruiter|intro(?:ductory)?) (?:screen|call|chat)\b/i,
      /\bschedule (?:a|some) time\b/i,
      /\b(?:calendly|goodtime|availability)\b/i,
    ],
  },
  {
    status: 'applied',
    patterns: [/\b(?:received|receiving) your application\b/i, /\bthank you for (?:applying|your application)\b/i],
  },
]

export interface EmailSuggestion {
  status: ApplicationStatus
  matchedPhrase: string
  application?: Application
}

export function classifyEmail(text: string): { status: ApplicationStatus; matchedPhrase: string } | null {
  for (const r of RULES)
    for (const p of r.patterns) {
      const m = text.match(p)
      if (m) return { status: r.status, matchedPhrase: m[0] }
    }
  return null
}

/** Which tracked application the email is about: company name mentioned in subject/body/sender. */
export function matchApplication(text: string, apps: Application[]): Application | undefined {
  const t = text.toLowerCase()
  const hits = apps.filter((a) => t.includes(a.company.toLowerCase()))
  // Prefer an exact title mention when the user applied to several roles at one company.
  return hits.find((a) => t.includes(a.title.toLowerCase())) ?? hits[0]
}

export function suggestFromEmail(text: string, apps: Application[]): EmailSuggestion | null {
  const c = classifyEmail(text)
  if (!c) return null
  return { ...c, application: matchApplication(text, apps) }
}
