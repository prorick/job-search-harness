<!-- adr template version: "adr 3.12.0" -->

# Company and role intel from Reddit

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: Phase 1 is link-out only — each job card offers well-targeted Reddit searches (company, company + role, and the career subreddits) that open in a new tab; fetching and summarizing threads in-app needs Reddit API credentials and a server, so it waits for a decision.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> Get some sort of feedback from reddit on prior hiring/interview process for that particular company/role

---

## Explicitation

**What I understand**:

1. Before (or after) applying, you want to know what others report about this company's hiring and interview process for this kind of role.
2. "Some sort of feedback" leaves the depth open — from "show me the threads" to "summarize what people say".

**Constraints I found**:

- Reddit's Data API requires OAuth app credentials and has terms that restrict use; unauthenticated automated access is rate-limited and often blocked. A browser on a static site can't hold the app secret (ADR-0001).
- Scraping reddit.com HTML is against its terms. I won't build that.

**Confirm**: prorick.

---

## Questions

### QST-REDDIT-DEPTH: How deep should Reddit intel go?
- Status: unanswered
- Why asking: each step up adds credentials, terms of service, and a server.
- Need: pick a letter (or override)

Options:
- **A — link-out**: Targeted search links per job (built: Jobs → "Reddit intel"). No API, no keys, no terms exposure.
- **B — link-out-plus**: A, plus the same treatment for other sources people use for interview reports (Glassdoor interview pages, Blind, Levels.fyi for pay) — still links only.
- **C — fetch-and-summarize**: Register a personal Reddit API app; a GitHub Action or the backend from ADR-0001 fetches matching threads for companies you're tracking, and an LLM (ADR-0004 QST-LLM-GRADING) summarizes "process, rounds, timeline, red flags" with links back to sources.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B — link-out-plus**, revisit C after a few weeks of use. *Rationale*: A/B give most of the value (the threads themselves) for zero credentials or terms risk; C stacks three dependencies (Reddit app, server, LLM) and summaries of small anecdotal samples can sound more authoritative than they are. *Confidence*: 0.7 — because I don't know how many companies you'll research; at dozens per week, reading threads by hand gets tedious and C starts to pay. *If wrong*: if you find yourself opening ten threads per company, flip to **C**.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Chosen (built): link-out searches

`redditSearches(company, title)` in `app/src/features/intel/reddit.ts` builds: `"<company>" interview` across Reddit (past year), `"<company>" hiring process`, `"<company>" "<title>"`, and subreddit-restricted searches in r/cscareerquestions, r/experienceddevs, r/recruitinghell, r/jobs, r/leetcode.

**Trade-offs accepted**: the subreddit list is tech-leaning; it should follow your field once QST-TARGETS (ADR-0003) is answered.

---

## Action Items

- [x] Link-out searches on job cards — Owner: Prospector 5.5
- [ ] Tune subreddits to your field after ADR-0003 QST-TARGETS — Owner: Prospector 5.5

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; link-out built
- Outcome: `Draft → Partially Implemented`

---

## Links

- Related ADRs: 0001 (no secrets on a static site), 0003 (QST-TARGETS sets the field), 0004 (LLM decision gates summarization)
- Related code: `app/src/features/intel/reddit.ts`
