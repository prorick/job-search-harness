// Company/role intel from Reddit — ADR-0005.
//
// Phase 1 is deliberately link-out only: build well-targeted Reddit searches the user opens in a
// new tab. No API calls, no scraping, no credentials, no ToS exposure from a static site. Whether
// to go further (OAuth app + Action-side fetch + summarization) is QST-REDDIT-DEPTH.

const SUBS = ['cscareerquestions', 'experienceddevs', 'recruitinghell', 'jobs', 'leetcode']

export interface IntelLink {
  label: string
  url: string
}

export function redditSearches(company: string, title?: string): IntelLink[] {
  const c = company.trim()
  if (!c) return []
  const q = (s: string) => encodeURIComponent(s)
  const links: IntelLink[] = [
    { label: `"${c}" interview — all of Reddit`, url: `https://www.reddit.com/search/?q=${q(`"${c}" interview`)}&sort=relevance&t=year` },
    { label: `"${c}" hiring process`, url: `https://www.reddit.com/search/?q=${q(`"${c}" hiring process`)}&t=all` },
  ]
  if (title?.trim())
    links.push({ label: `"${c}" ${title.trim()}`, url: `https://www.reddit.com/search/?q=${q(`"${c}" "${title.trim()}"`)}&t=all` })
  for (const s of SUBS)
    links.push({ label: `r/${s}: ${c}`, url: `https://www.reddit.com/r/${s}/search/?q=${q(`"${c}"`)}&restrict_sr=1&t=all` })
  return links
}
