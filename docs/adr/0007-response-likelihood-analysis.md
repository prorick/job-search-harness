<!-- adr template version: "adr 3.12.0" -->

# Response-likelihood analysis

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: Estimate the chance a new application gets a response from your *own* comparable past applications (same referral status, similar match score, similar posting age) with a Beta-Binomial model that starts from a weak prior and **always shows its uncertainty range** — because with a few dozen applications, anything fancier fits noise.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> Compare roles you were able to get a response to and use that data to get a likely response analysis on the new company you are applying to.

---

## Explicitation

**What I understand**:

1. Learn from your history which applications got responses (screen, interview or offer — even if later rejected).
2. For a new application, say how likely a response is, based on how similar past ones fared.

**The doubt that shapes everything (Second Directive)**: sample size. A typical search is tens to a couple of hundred applications with response rates in the single or low double digits, so you'll have *few* positive examples. With 3 responses out of 40, a model with ten features will "discover" patterns that are pure coincidence. So the design is deliberately small:
   - **Few features**: referral (yes/no), match score (±15 points), posting age bucket (≤3 / ≤10 / ≤30 / older days).
   - **A prior**: start from a base rate worth 10 pseudo-applications, so one lucky response can't produce "100%" (test: `likelihood.test.ts`, "does not swing to 100%…").
   - **An honest range**: an 80% interval shown every time, and a note saying whether the estimate came from *similar* applications (≥ 5 of them) or fell back to *all* of yours.

**Confirm**: prorick.

---

## Questions

### QST-PRIOR: What starting response rate should the model assume before it has your data?
- Status: unanswered
- Why asking: `PRIOR_RATE = 0.08` in `app/src/features/insights/likelihood.ts` is a **placeholder I chose, not a sourced figure**. Cold-application response rates vary a lot by field, seniority and market; the prior dominates the estimate for your first ~20 applications.
- Need: pick a letter (or override with a number)

Options:
- **A — keep-8pct**: Keep 8% as a rough cold-apply guess; it fades as your data accumulates.
- **B — your-past**: If you've job-searched before and remember roughly "I heard back from 1 in N", use that.
- **C — field-sourced**: I look for a credible published figure for your field and level (after ADR-0003 QST-TARGETS), cite it in this ADR, and use it.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B if you have it, else C.** *Rationale*: your own past is the most relevant prior; a sourced field figure beats my unsourced guess; A is acceptable only because the prior's weight is small (10 pseudo-applications). *Confidence*: 0.7 — because the prior matters early on and stops mattering later, so this is low-stakes but not no-stakes. *If wrong*: if you'll log 50+ applications quickly, the prior barely matters and **A** is fine.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-FEATURES: Which application traits should define "comparable"?
- Status: unanswered
- Why asking: every added trait splits your small history into thinner slices. The three built in are ones the harness records automatically. Others are plausible but cost data or effort.
- Need: pick any letters to add (or override)

Options:
- **A — keep-three**: Referral, match score, posting age (built).
- **B — plus-resume-variant**: Add which résumé version was sent (needs ADR-0002 QST-RESUME-VARIANTS B).
- **C — plus-source**: Add how you applied (company site, LinkedIn Easy Apply, recruiter outreach, referral portal).
- **D — plus-company**: Add company size or industry (you'd tag these by hand or we'd look them up).

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**A + C — add application source.** *Rationale*: how you applied plausibly matters as much as anything (Easy Apply vs. a referral), it's one dropdown at apply time, and it tests your "apply early" belief alongside posting age. B follows automatically if variants are adopted; D adds tagging work for a weak signal at small N. *Confidence*: 0.6 — because this is a judgment about which signals are strong, not a measurement. *If wrong*: if most applications go through one channel, source has no variance and **A** alone is right.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Chosen (built): Beta-Binomial over comparable applications

- `betaEstimate(responses, n)`: posterior mean of Beta(prior·10 + responses, (1−prior)·10 + misses), with an 80% normal-approximation interval clamped to [0, 1].
- `estimateResponse(history, candidate)`: filters to comparable applications; needs ≥ 5 to use them, otherwise falls back to all of yours.
- "Response" = furthest stage reached ≥ screen (`gotResponse()` in `tracker.ts`), so a later rejection doesn't erase that they answered.
- Insights page: enter a match score / posting age / referral and read the estimate with its range and basis.

**Trade-offs accepted**: no interaction effects, no time decay (an application from 6 months ago weighs the same as last week's).

---

## Open Follow-ups

- [ ] Future task: once you have ~30 applications, add a "what's working" table: response rate by posting-age bucket, by referral, by match-score band, each with its range. That's the descriptive half of "compare roles you got a response to" and is arguably more useful than the prediction.
- [ ] Concern: "ghosted" vs. "still waiting" is ambiguous for recent applications; they currently count as no response. A minimum age before counting would reduce that bias.

---

## Action Items

- [x] Estimator, comparable-set logic, Insights UI, tests — Owner: Prospector 5.5
- [ ] Answer QST-PRIOR and QST-FEATURES — Owner: prorick

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; estimator built and tested
- Outcome: `Draft → Partially Implemented`

---

## Glossary (optional)

- **Response**: the company moved you to screen, interview or offer at any point.
- **Prior**: the assumed base rate the estimate starts from, weighted as 10 imaginary applications.

---

## Links

- Related ADRs: 0002 (résumé variants), 0003 (posting age), 0004 (match score), 0006 (tracker history)
- Related code: `app/src/features/insights/likelihood.ts`, `app/src/pages/InsightsPage.tsx`
