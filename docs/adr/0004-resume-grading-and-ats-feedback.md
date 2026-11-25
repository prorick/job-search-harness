<!-- adr template version: "adr 3.12.0" -->

# Résumé grading and ATS feedback

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: A deterministic, offline keyword-coverage score plus structural ATS checks is built and explains every point; an optional Claude-powered review on top of it is recommended but not built, pending how you want the API key handled.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> Grade your resume based on job description
> Give feedback on what changes you can make to pass AST Resume screening

---

## Explicitation

**What I understand**:

1. **Grade** — a number saying how well your résumé covers a given job description.
2. **Feedback to "pass ATS screening"** — concrete changes that make it more likely a human ever sees the résumé.

**A doubt worth surfacing (Second Directive)**: the popular picture of ATS — software that auto-rejects résumés below a keyword score — is mostly folklore. The common systems (Greenhouse, Lever, Workday, iCIMS) mainly **parse** résumés into fields and let recruiters **search and filter**; automatic rejections usually come from **knockout questions** on the application form (work authorization, location, years of experience, degree), not from keyword percentages. So "passing ATS" really means three things:
   - **Parseable**: contact info, dates and section headings get extracted correctly (ADR-0002's single-column PDF serves this).
   - **Findable**: the terms a recruiter would search for are in the résumé, truthfully.
   - **Survives the skim**: quantified, readable bullets.

   I'm confident in the direction of this claim but haven't cited a source here; treat it as a well-founded working assumption, not a measurement.

**Assumptions**: the score should be explainable — you should see *which* terms count, not get an opaque number.

**Confirm**: prorick — does this reframing match what you meant by "pass ATS"?

---

## Questions

### QST-ATS-MEANING: What should "pass ATS" mean in this harness?
- Status: unanswered
- Why asking: it changes what the score optimizes. A pure keyword-percentage score invites keyword stuffing, which recruiters penalize when they read the résumé.
- Need: pick a letter (or override)

Options:
- **A — keyword-score**: Headline the keyword-match percentage, the way commercial "ATS checker" sites do.
- **B — three-part**: Report parseable / findable / skim-ready separately, with the keyword score as the "findable" part, and flag knockout risks found in the job description (e.g. "requires US work authorization", "5+ years").

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B — three-part.** *Rationale*: it matches how screening actually fails (Explicitation above), and the pieces already exist: `atsFindings()` covers parseable/skim, `scoreResume()` covers findable (`app/src/features/scoring/match.ts`). Knockout detection is the new part. *Confidence*: 0.8 — because the reframing rests on how the major ATS products are built, which I'm fairly sure of but haven't re-verified this session. *If wrong*: if you're applying mostly through agencies or high-volume portals that really do auto-rank by keyword, **A**'s single number is the more useful signal.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-LLM-GRADING: Add a Claude-powered review on top of the keyword score?
- Status: unanswered
- Why asking: keyword matching can't tell that "built ETL pipelines in Spark" covers "data engineering experience", and can't rewrite a bullet. An LLM can. But the app is static (ADR-0001), so the question is whose key, stored where.
- Need: pick a letter (or override)

Options:
- **A — keyword-only**: No LLM. Free, private, offline, explainable.
- **B — your-key-in-browser**: You paste your own Anthropic API key in Settings; the browser calls the API directly. The official TypeScript SDK requires an explicit `dangerouslyAllowBrowser: true` opt-in for this, because any key in a browser is readable by anything running on that page. The risk is limited to *your* key in *your* browser, and the key would be kept in session storage (gone when the tab closes) unless you opt to remember it. You pay per use.
- **C — via-backend**: The key lives in the serverless function from ADR-0001 QST-NEON-PATH B. Safest, but needs that backend first.
- **D — via-claude-code**: No in-app LLM. Export the résumé + job description and ask Claude in a Claude Code session in this repo, which writes suggestions back as a file you import.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B — your-key-in-browser**, opt-in, with the keyword score always shown beside it. *Rationale*: it's the only option that gives in-app semantic feedback without building a backend first, the exposure is confined to your own key, and the deterministic score stays as an explainable baseline (`match.ts` header comment). It would use the official `@anthropic-ai/sdk` with structured output, so suggestions come back as data the UI can diff against your bullets. *Confidence*: 0.6 — because the key-in-browser trade-off is a personal risk call, and D costs nothing extra if you already use Claude Code. *If wrong*: if you're uneasy about any key in a browser, **D** now and **C** later; if per-use API cost matters, **D**.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Chosen (built): deterministic baseline

- `extractKeywords()`: terms the job description **repeats** (≥ 2 mentions) or names as known multi-word phrases ("distributed systems", "machine learning"…), with stopword and boilerplate filtering. The tokenizer keeps tech spellings intact (`c++`, `c#`, `node.js`, `ci/cd`).
- `scoreResume()`: weighted share of those terms present in the résumé → 0–100, plus lists of matched and missing terms.
- `atsFindings()`: missing email/phone, roles without start dates, share of bullets with a number, overlong bullets, and the top missing terms with an explicit *"add the ones that truthfully describe your experience — never keyword-stuff."*
- The Score tab works against a saved job (`/score?job=<id>`) or a pasted description.

**Trade-offs accepted**: lexical only — misses synonyms; terms mentioned only once in a description are ignored (that's what keeps "and"-level noise out).

---

## Open Follow-ups

- [ ] Future task: knockout-question detection (work authorization, clearance, years, degree, location) — part of QST-ATS-MEANING B.
- [ ] Future task: synonym groups (`js`/`javascript`, `postgres`/`postgresql`, `k8s`/`kubernetes`).

---

## Action Items

- [x] Keyword score, ATS checks, Score page, tests — Owner: Prospector 5.5
- [ ] Answer QST-ATS-MEANING and QST-LLM-GRADING — Owner: prorick

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; deterministic scorer built and tested
- Outcome: `Draft → Partially Implemented`

---

## Glossary (optional)

- **ATS**: applicant tracking system — the software employers use to receive, parse, search and move applications (the brief's "AST").
- **Knockout question**: an application-form question whose wrong answer auto-rejects (e.g. "Will you require sponsorship?").

---

## Links

- Related ADRs: 0001 (secrets on a static site), 0002 (parseable PDF), 0007 (match score as a response feature)
- Related code: `app/src/features/scoring/match.ts`, `app/src/pages/ScorePage.tsx`
