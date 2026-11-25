<!-- adr template version: "adr 3.12.0" -->

# Résumé data model and PDF generation

- **Date**: 2026-11-24
- **Iteration**: 1
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: The résumé is structured data (a zod schema), rendered to a single-column, real-text PDF with `@react-pdf/renderer` — the layout ATS parsers read best; the editor is a validated JSON textarea until we decide what the real editor should be.

---

## Originating Context

**Source**: `Brief: prompt.txt`

> We will want to collect information and generate PDF of my résumé, so load the TypeScript libraries […]

and, from the feature list: *"Grade your resume based on job description"*, *"Give feedback on what changes you can make to pass AST Resume screening"* (read as **ATS** — applicant tracking system).

---

## Explicitation

**What I understand**:

1. **"Collect information"** — the résumé should be *data* (sections, bullets, dates), not a document blob, so the harness can score it against job descriptions (ADR-0004) and produce variants.
2. **"Generate PDF"** — the output must be a PDF that an ATS can parse: selectable text, standard headings, one column, no text in images, no tables.

**Assumptions**:

- You have an existing résumé (PDF or Word) somewhere; it's not in this repo, and should stay out of it (ADR-0001).
- US Letter, one page is the target, but the renderer must handle overflow gracefully.

**Confirm**: prorick.

---

## Questions

### QST-RESUME-EDITOR: How should you get your résumé into the harness and edit it?
- Status: unanswered
- Why asking: the Résumé tab today is a JSON textarea with live validation, ATS checks and "Download PDF" (`app/src/pages/ResumePage.tsx`). That works, but nobody wants to hand-edit JSON every time they tailor a bullet. The editor is the biggest UI investment left, so I want to build the right one.
- Need: pick one or more letters (or override)

Options:
- **A — json-only**: Keep the JSON editor. Fastest; fine if Claude does most edits for you in this repo's sessions.
- **B — form-editor**: A proper form: sections, add/remove/reorder entries and bullets, live PDF preview beside it.
- **C — json-resume-io**: Import/export the open **JSON Resume** schema, so résumés from other tools come in and go out, plus a one-time "paste your current résumé text and Claude converts it" step done in a session (not in the app).
- **D — pdf-import**: Parse an uploaded PDF/DOCX into fields in-browser. Notoriously lossy — the same parsing ATS systems get wrong.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B + C — form-editor with JSON Resume import/export.** *Rationale*: B is what makes tailoring per application fast (QST-RESUME-VARIANTS); C gives a lossless way in from your existing résumé without the parsing problems of D, and keeps the data portable. *Confidence*: 0.75 — because the editor is clearly needed, but you may prefer to do edits conversationally with Claude, which would make A enough. *If wrong*: if you'd rather say "tighten my Acme bullets" to Claude than click through a form, stay on **A** plus **C**.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-RESUME-VARIANTS: One master résumé, or a tailored variant per application?
- Status: unanswered
- Why asking: the schema already allows many résumés (`Resume.id`, `label`), and each tracked application records `resumeId` and the `matchScore` at the time you applied (`app/src/domain/schemas.ts`). Today the "I applied" button always uses the first résumé. Variants make ADR-0007's analysis much more useful ("tailored résumés got 2× the responses") — but each one is more to maintain.
- Need: pick a letter (or override)

Options:
- **A — single-master**: One résumé; tailoring happens outside the harness.
- **B — master-plus-variants**: A master plus per-job copies ("Acme – Backend"), each linked to the application that used it; the tracker shows which version you sent.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B — master-plus-variants.** *Rationale*: you listed both "grade your résumé against a JD" and "use response data to predict" — the first produces tailored versions, the second needs to know which version went where; the data model already carries `resumeId`. *Confidence*: 0.8 — because the plumbing exists; the cost is mostly UI. *If wrong*: if you apply in volume (dozens a week) with one résumé, **A** — tailoring won't happen and variants would be clutter.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Context
Need a PDF that both a human and an ATS parse correctly, generated in the browser on a static site.

### Options

**Option A**: `@react-pdf/renderer` — React components → vector PDF with real text.
- Pros: TypeScript-native, declarative layout, real selectable text, page breaks, links; runs in browser *and* Node (so it's unit-testable).
- Cons: ~1.2 MB (lazy-loaded); built-in fonts are the PDF standard 14 (Latin-1 only).

**Option B**: `window.print()` with print CSS.
- Pros: zero dependency, full CSS.
- Cons: output depends on the browser's print dialog and margins; not testable; users get inconsistent files.

**Option C**: jsPDF / pdfmake — imperative or JSON layout.
- Pros: smaller.
- Cons: manual coordinates (jsPDF) or a second layout language (pdfmake); text-wrapping and page-break work by hand.

### Chosen: Option A — `@react-pdf/renderer`

**Rationale**: deterministic output, real text for ATS, and it's tested in Node — `app/src/pdf/ResumeDocument.test.tsx` renders an 8-job résumé with accents, en dashes and ampersands and asserts a valid multi-page PDF.

**Trade-offs accepted**: big library (mitigated by lazy loading in `ResumePage.tsx`); Helvetica only for now.

### Consequences
- Template: single column; headings SUMMARY / EXPERIENCE / PROJECTS / EDUCATION / SKILLS — the standard names ATS section detectors look for.
- `app/src/pdf/ResumeDocument.tsx` is the one template; more templates are a later choice.

---

## Open Follow-ups

- [ ] Concern: the PDF standard fonts cover Latin-1 only. A name or bullet with characters outside it (e.g. CJK, Devanagari, many emoji) renders as blank boxes. Fix when needed: register an embedded font (e.g. Noto Sans) with `Font.register`.
- [ ] Future task: one-page fit check — warn when the PDF spills onto page 2.

---

## Action Items

- [x] Schema + PDF renderer + lazy load + render test — Owner: Prospector 5.5
- [ ] Build the editor chosen in QST-RESUME-EDITOR — Owner: Prospector 5.5
- [ ] Add variant UX per QST-RESUME-VARIANTS — Owner: Prospector 5.5

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; renderer built and tested
- Outcome: `Draft → Partially Implemented`

---

## Links

- Related ADRs: 0001 (no personal data in repo), 0004 (scoring reads this schema), 0007 (variants feed analysis)
- Related code: `app/src/domain/schemas.ts` (`Resume`), `app/src/pdf/ResumeDocument.tsx`, `app/src/pages/ResumePage.tsx`
