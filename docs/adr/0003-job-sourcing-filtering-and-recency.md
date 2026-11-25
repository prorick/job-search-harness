<!-- adr template version: "adr 3.12.0" -->

# Job sourcing, filtering, and recency

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: Filtering (title/role/pay/location/workplace/posted-within) and freshest-first ordering are built over jobs you add by hand; **where jobs come from automatically is the open question**, and the recommendation is a scheduled GitHub Action that polls public applicant-tracking-system boards for a company watchlist.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> Ability to filter out jobs based on title/role/pay/location
> See which roles have been out recently. Newly posted roles tend to have the best outcomes

---

## Explicitation

**What I understand**:

1. **Filtering** — narrow a list of postings by title text, role family, minimum pay, location(s), and workplace policy.
2. **Recency** — show freshest first and let you cut off by age, because applying early is believed to help.
3. **Unstated but load-bearing: a source of jobs.** Filtering needs a list. The brief doesn't say where the list comes from, and on a static site this is the hardest problem in the whole harness.

**Assumptions**:

- Pay comparisons are annualized at 2,080 h/yr so an hourly contract can be compared to a salary.
- A pay filter compares against the **top** of the posted band (a $120–180k role can still meet a $150k floor).
- Many postings omit pay; you choose whether they survive a pay filter (default: they do).

**Confirm**: prorick — especially QST-JOB-SOURCE and QST-TARGETS.

---

## Questions

### QST-JOB-SOURCE: Where should job postings come from?
- Status: unanswered
- Why asking: a static site can't scrape — browsers block most cross-site requests (CORS), job boards prohibit scraping in their terms, and LinkedIn/Indeed have no public API for this. What's actually available: many companies post through applicant-tracking systems (Greenhouse, Lever, Ashby, Workday…) and several of those expose **public, documented job-board JSON** per company. Today the app only has manual entry (Jobs → "+ Add job").
- Need: pick one or more letters (or override)

Options:
- **A — manual**: Paste jobs by hand (built). Zero risk, high effort per job.
- **B — watchlist-action**: You list companies (e.g. `stripe → greenhouse`, `netflix → lever`). A GitHub Action runs on a schedule (e.g. every 6 h), fetches those public boards server-side (no CORS problem), and publishes a `jobs.json` the app loads. Bonus: the Action records the **true first-seen time**, which catches "reposted" jobs that claim to be new.
- **C — browser-direct**: The app calls the ATS board APIs straight from your browser. Works only for vendors that allow cross-origin requests — unverified per vendor; I'd test before relying on it.
- **D — aggregator-api**: A commercial aggregator (Adzuna, JSearch on RapidAPI, USAJobs for federal roles). Broad coverage; needs an API key, has quotas and terms, and the key needs a server (ADR-0001 QST-NEON-PATH).
- **E — save-button**: A bookmarklet or small browser extension: on any posting page (including LinkedIn), click "Save to harness" and it captures title/company/URL/description into the app.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B + E — watchlist Action for target companies, save-button for everything else.** *Rationale*: B is the only option that is automatic, free, within terms (public, documented endpoints), and gives honest recency data, the thing your second bullet is about; E covers postings found on LinkedIn and elsewhere without scraping them. A stays as the fallback. *Confidence*: 0.65 — because I have not yet verified each ATS endpoint's current shape or rate limits, and B's `jobs.json` is public if the repo is (ADR-0001 QST-REPO-VISIBILITY). *If wrong*: if your targets are mostly companies on Workday or custom career sites (no public JSON), B covers little — lean on **E**, and consider **D** once a backend exists.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-TARGETS: What are you looking for?
- Status: unanswered
- Why asking: this sets the default filters and seeds the watchlist for QST-JOB-SOURCE B. I don't know your field, level, location constraints or pay floor, and I shouldn't guess them.
- Need: explanation — roles/titles; seniority (intern / new grad / experienced); locations and remote preference; pay floor; work authorization constraints if any; 10–30 companies you'd most like to work at.

Options: none (elicitation)

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

No pick — this one is yours. Rough answers are fine; filters are easy to change. *Confidence*: n/a. *If wrong*: n/a.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-FRESHNESS: What counts as "new"?
- Status: unanswered
- Why asking: the badges use guesses: **new** ≤ 3 days, **recent** ≤ 10, **aging** ≤ 30, **stale** after (`app/src/features/jobs/filter.ts`, `freshness()`). "Newly posted roles do best" is plausible — early applicants are reviewed before a shortlist forms — but I have no source for exact cut-offs, and the right ones vary by field.
- Need: pick a letter (or override)

Options:
- **A — keep-guesses**: Keep 3 / 10 / 30 days, and once you have ~30 tracked applications, check them against your own response data (ADR-0007 records `daysSincePosted` for each).
- **B — tighter**: 1 / 3 / 7 days, if you're in a high-volume field where roles fill within a week.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**A — keep-guesses, then calibrate.** *Rationale*: every tracked application already stores posting age at apply time (`Application.daysSincePosted`), so the cut-offs can come from your own outcomes instead of folklore. *Confidence*: 0.7 — because the buckets only change badges and sort, so being wrong is cheap. *If wrong*: if your field is new-grad tech, where large postings get thousands of applicants within days, start with **B**.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Chosen: pure filter + recency functions over a local job list

- `filterJobs()` in `app/src/features/jobs/filter.ts`: all words of the text query must appear in title or company; role exact match; pay floor against the annualized band top; any-of location substrings; workplace policy; posted-within-days.
- Recency clock = **employer's posted date if present, else first-seen**. A job seen today but posted 20 days ago is *not* fresh — a test pins this (`filter.test.ts`, "sorts freshest first…").
- Covered by 7 tests in `filter.test.ts`; a deliberate mutation (dropping the hourly→annual conversion) was caught by the suite on 2026-11-24.

**Trade-offs accepted**: role is free text you type; no salary normalization across currencies yet.

---

## Open Follow-ups

- [ ] Doubt: employers "refresh" old postings so they look new on aggregators. Only a first-seen clock that *we* control (QST-JOB-SOURCE B) detects this.
- [ ] Future task: de-duplicate the same job seen via two sources (match on company + normalized title + location).

---

## Action Items

- [x] Filters, freshness, manual entry — Owner: Prospector 5.5
- [ ] Answer QST-TARGETS and QST-JOB-SOURCE — Owner: prorick
- [ ] Verify each chosen ATS endpoint, then build the watchlist Action — Owner: Prospector 5.5

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; filtering and recency built and tested
- Outcome: `Draft → Partially Implemented`

---

## Links

- Related ADRs: 0001 (repo visibility affects watchlist privacy), 0007 (posting age as a response feature)
- Related code: `app/src/features/jobs/filter.ts`, `app/src/pages/JobsPage.tsx`
