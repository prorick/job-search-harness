<!-- adr template version: "adr 3.12.0" -->

# Application tracker, email updates, and the applications graph

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: A sortable spreadsheet-style tracker with full status history and CSV export, a paste-an-email classifier that *suggests* status changes for you to confirm, and a Sankey funnel of where applications went are built; how emails reach the tracker automatically, and what "graph of places" should show, are open.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> Have a spreadsheet tracker of every job you clicked apply to
> Ability to see emails to update the tracker if you move forward or get rejected
> Create a visual graph of all the places you applied to.

---

## Explicitation

**What I understand**:

1. **Tracker** — one row per application: company, role, location, date, status, link, plus what the analysis in ADR-0007 needs (match score at apply time, posting age at apply time, referral).
2. **Email updates** — recruiter emails ("we'd like to schedule a call", "unfortunately…") should move the matching row forward.
3. **Visual graph** — ambiguous; see QST-GRAPH-MEANING.

**Design choices made**:

- Status changes append to a **history**, so "furthest stage reached" survives a later rejection. A rejection *after an interview* still counts as a response; a test pins this (`tracker.test.ts`).
- Email-derived changes are **suggestions you confirm**, never automatic. The classifier is a ranked rule list (offer > rejection > interview > screen > acknowledgement), and some phrasings will fool it — e.g. "Unfortunately the interviewer is out, can we move your onsite?" reads as a rejection. Confirming each change is what makes that acceptable.

**Confirm**: prorick.

---

## Questions

### QST-EMAIL-SOURCE: How should recruiter emails reach the tracker?
- Status: unanswered
- Why asking: today you paste an email into Tracker → "Update from an email". Automatic means reading your inbox, which is the most privacy-sensitive thing in this whole project. Note: this Claude Code session has a Gmail connector available. **I have not read any of your email** and won't without your say-so.
- Need: pick a letter (or override)

Options:
- **A — paste**: Keep paste-and-confirm (built). Private and manual.
- **B — gmail-in-app**: "Connect Gmail" button using Google's browser OAuth with read-only Gmail access. Google classes Gmail read access as a *restricted* scope: for personal use you'd create your own Google Cloud OAuth client in "testing" mode with yourself as the only test user, and you'll likely have to re-consent periodically. The app searches recent mail from tracked companies and shows suggestions.
- **C — claude-session**: In a Claude Code session here, you ask "check my email for application updates"; Claude uses the Gmail connector to find recruiter mail and writes a suggestions file you import (the app can't be written to from outside your browser until Neon exists). No OAuth setup on your side.
- **D — forwarding**: A mail rule forwards recruiter emails to a parsing service. Needs a server; not before ADR-0001's backend exists.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**C — claude-session now, B as the in-app goal.** *Rationale*: C works today with no Google Cloud setup and keeps reading your inbox an explicit, per-request act; B is the better product (one click, no session) but has real setup friction (restricted scope, test-mode consent). *Confidence*: 0.55 — because this is mostly a privacy and convenience preference only you can weigh. *If wrong*: if you want it to "just work" inside the app and don't mind a 20-minute Google Cloud setup, go straight to **B**; if no inbox access feels right, **A**.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-GRAPH-MEANING: What should the "visual graph of all the places you applied to" show?
- Status: unanswered
- Why asking: "places" could mean pipeline stages, geography, or companies over time. I built the funnel (Insights → Sankey: applied → screen → interview → offer / rejected / ghosted / awaiting). I'm not sure it's what you pictured.
- Need: pick one or more letters (or override)

Options:
- **A — funnel**: The Sankey flow (built).
- **B — map**: Applications on a map by location, colored by outcome.
- **C — timeline**: Applications over time (per week), stacked by current status — shows momentum and how long responses take.
- **D — company-graph**: A network of companies grouped by industry or size, sized by number of applications, colored by outcome.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**A + C — funnel and timeline.** *Rationale*: the funnel shows where applications die (the actionable signal), and a timeline shows pace and response lag, both computable from data the tracker already stores; a map (B) needs geocoding and matters mainly if location drives your search. *Confidence*: 0.5 — because "places" most literally suggests **B**, and I may be over-reading. *If wrong*: if you meant geography, **B** (I'd geocode offline from city names to avoid sending your locations to a third-party API).

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Chosen (built)

- **Tracker** (`app/src/pages/TrackerPage.tsx`): TanStack Table v9 with sortable columns; inline status dropdown; **Export CSV** (RFC 4180 quoting — commas and quotes in notes survive opening in Excel/Sheets; tested).
- **"I applied"** on a job card creates the row with `matchScore` (vs. your first résumé) and `daysSincePosted` captured at that moment.
- **Email suggestions** (`app/src/features/tracker/email.ts`): classify, match to a tracked company (preferring an exact title mention when you applied to several roles there), confirm.
- **Funnel** (`app/src/pages/InsightsPage.tsx`): Sankey with labeled stages and counts (verified rendering with seeded data, 2026-11-24).

**Trade-offs accepted**: a "spreadsheet" is CSV export, not live Google Sheets sync (easy to add later if you want it); the email classifier is regex rules, English only.

---

## Open Follow-ups

- [ ] Future task: "ghosted" auto-suggestion after N days with no status change (N to be chosen; 21 is a common rule of thumb).
- [ ] Future task: edit notes, referral flag and dates inline in the tracker (schema supports it; UI doesn't yet).

---

## Action Items

- [x] Tracker, CSV export, email suggestions, funnel — Owner: Prospector 5.5
- [ ] Answer QST-EMAIL-SOURCE and QST-GRAPH-MEANING — Owner: prorick

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; tracker, email suggestions and funnel built and tested
- Outcome: `Draft → Partially Implemented`

---

## Links

- Related ADRs: 0001 (no server; Neon path), 0007 (tracker data feeds the analysis)
- Related code: `app/src/features/tracker/tracker.ts`, `app/src/features/tracker/email.ts`, `app/src/pages/TrackerPage.tsx`, `app/src/pages/InsightsPage.tsx`
