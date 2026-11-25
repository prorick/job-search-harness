// Résumé ↔ job-description matching and ATS feedback — ADR-0004.
//
// This is the deterministic, offline baseline: it runs in the browser with no API key and
// explains every point it awards. An optional LLM layer (QST-LLM-GRADING) would sit on top of
// it, not replace it — the user should always be able to see *why* a score is what it is.
import type { Resume } from '../../domain/schemas'

const STOPWORDS = new Set(
  `a an and are as at be been but by can for from has have in into is it its of on or our that the their
   this to was we were will with you your who what when where which while within without about across all
   also any both each more most other some such than then there these they those through under up very
   able work working team teams role roles job position candidate candidates experience experiences years year
   strong excellent ability skills skill including include etc must should would may might new well using use
   help helps including ensure ensuring across based plus preferred required requirements responsibilities
   qualifications opportunity company equal employer benefits salary`.split(/\s+/),
)

/** Multi-word terms ATS keyword filters commonly look for as a unit. Extend freely. */
const PHRASES = [
  'machine learning', 'deep learning', 'data science', 'data engineering', 'computer science',
  'distributed systems', 'system design', 'product management', 'project management',
  'natural language processing', 'computer vision', 'continuous integration', 'unit testing',
  'react native', 'node.js', 'ci/cd', 'a/b testing', 'rest api', 'cross-functional',
]

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
}

/** Tokens that keep tech spellings intact: c++, c#, node.js, ci/cd, .net */
export function tokenize(text: string): string[] {
  return normalize(text).match(/[a-z0-9][a-z0-9+#./-]*[a-z0-9+#]|[a-z0-9]/g) ?? []
}

export interface Keyword {
  term: string
  weight: number
}

/** Terms the JD repeats or phrases it names, weighted by frequency. */
export function extractKeywords(jd: string, limit = 30): Keyword[] {
  const text = normalize(jd)
  const counts = new Map<string, number>()
  for (const p of PHRASES) {
    const n = text.split(p).length - 1
    if (n > 0) counts.set(p, n * 2) // a named phrase is a strong signal
  }
  for (const t of tokenize(text)) {
    if (t.length < 2 || STOPWORDS.has(t) || /^\d+$/.test(t)) continue
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([term, weight]) => ({ term, weight }))
    .filter((k) => k.weight >= 2 || PHRASES.includes(k.term))
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term))
    .slice(0, limit)
}

export function resumeText(r: Resume): string {
  return [
    r.summary,
    ...r.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...r.education.flatMap((e) => [e.school, e.degree, ...e.details]),
    ...r.projects.flatMap((p) => [p.name, ...p.bullets]),
    ...r.skills.flatMap((s) => [s.group, ...s.items]),
  ].join('\n')
}

function contains(haystackTokens: Set<string>, haystack: string, term: string): boolean {
  return term.includes(' ') ? haystack.includes(term) : haystackTokens.has(term)
}

export interface Finding {
  severity: 'fix' | 'consider'
  message: string
}

export interface MatchResult {
  /** 0–100: weighted share of JD keywords present in the résumé. */
  score: number
  matched: Keyword[]
  missing: Keyword[]
  findings: Finding[]
}

export function scoreResume(resume: Resume, jd: string): MatchResult {
  const keywords = extractKeywords(jd)
  const text = normalize(resumeText(resume))
  const tokens = new Set(tokenize(text))
  const matched = keywords.filter((k) => contains(tokens, text, k.term))
  const missing = keywords.filter((k) => !contains(tokens, text, k.term))
  const total = keywords.reduce((s, k) => s + k.weight, 0)
  const got = matched.reduce((s, k) => s + k.weight, 0)
  const score = total === 0 ? 0 : Math.round((100 * got) / total)
  return { score, matched, missing, findings: atsFindings(resume, missing) }
}

/** Structural checks that commonly trip ATS parsers or recruiters' six-second skim. */
export function atsFindings(r: Resume, missing: Keyword[] = []): Finding[] {
  const out: Finding[] = []
  if (!r.basics.email) out.push({ severity: 'fix', message: 'No email address — ATS contact extraction will come back empty.' })
  if (!r.basics.phone) out.push({ severity: 'consider', message: 'No phone number.' })
  if (r.experience.length === 0) out.push({ severity: 'fix', message: 'No Experience section entries.' })
  for (const e of r.experience) {
    if (!e.start) out.push({ severity: 'fix', message: `"${e.title} @ ${e.company}" has no start date — ATS tenure parsing needs dates.` })
    if (e.bullets.length === 0) out.push({ severity: 'consider', message: `"${e.title} @ ${e.company}" has no bullets.` })
  }
  const bullets = r.experience.flatMap((e) => e.bullets)
  const quantified = bullets.filter((b) => /\d/.test(b)).length
  if (bullets.length >= 3 && quantified / bullets.length < 0.4)
    out.push({ severity: 'consider', message: `Only ${quantified}/${bullets.length} bullets carry a number — quantify impact where you honestly can.` })
  const long = bullets.filter((b) => b.length > 220).length
  if (long) out.push({ severity: 'consider', message: `${long} bullet(s) over ~2 lines — trim for skimmability.` })
  const top = missing.slice(0, 8).map((k) => k.term)
  if (top.length)
    out.push({ severity: 'consider', message: `JD terms absent from your résumé: ${top.join(', ')}. Add the ones that truthfully describe your experience — never keyword-stuff.` })
  return out
}
