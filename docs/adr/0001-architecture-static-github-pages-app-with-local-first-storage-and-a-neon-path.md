<!-- adr template version: "adr 3.12.0" -->

# Architecture: static GitHub Pages app with local-first storage and a Neon path

- **Date**: 2026-11-24
- **Iteration**: 2
- **Status**: Partially Implemented
- **Deciders**: prorick (human), Prospector 5.5 (Claude Opus 5.5)

**TL;DR**: A Vite + React + strict-TypeScript single-page app in `app/`, deployed to GitHub Pages by a gated Actions workflow, storing everything in the browser's localStorage behind an async, schema-validated `Collection<T>` interface so Neon can replace it later without touching call sites.

---

## Originating Context

**Source**: `Brief: prompt.txt` (founding brief, delivered by `pneumatic recruit`)

> We want the harness to be deployed to GitHub Pages, and to use local storage as a storage, for now, with possibility to later expand to Neon. We will want to collect information and generate PDF of my résumé, so load the TypeScript libraries and configure the template, define the ADRs, you will see.
>
> I would like you to create a "job search harness" as a private GitHub repository on my account […] Actually, forget some of what I have said, we are already in a repo made from the template, so take it from there.

**Agency Grant**: "load the TypeScript libraries and configure the template, define the ADRs, you will see" — read as: choose the stack, scaffold it, record the reasoning.

---

## Explicitation

**What I understand**:

1. **Hosting = GitHub Pages** — static files only. No server code, no secrets at runtime, no SPA fallback routing. Every feature that needs a server (scheduled fetching, API keys, OAuth secrets) must either run in the browser, run in GitHub Actions, or wait for a backend.
2. **Storage = localStorage now, Neon later** — the data layer must be swappable. Neon is Postgres; a browser cannot safely hold a Postgres connection string, so "later Neon" implies *some* server-side piece (see QST-NEON-PATH).
3. **The repo should be private** — the brief says so; the repo as found is **public** (see QST-REPO-VISIBILITY).

**Assumptions**:

- Single user (you), one or two devices, hundreds — not millions — of records. Whole-collection reads are fine.
- The résumé and application history are personal data; they must never be committed to this repo.

**Confirm**: prorick — especially QST-REPO-VISIBILITY, which contradicts the brief as written.

---

## Questions

### QST-REPO-VISIBILITY: The brief asked for a private repo; `prorick/job-search-harness` is public. Which do you want?
- Status: answered
- Why asking: `gh repo view` reports `visibility: PUBLIC`. On a personal GitHub Free account, GitHub Pages can only publish from a **public** repo; Pages from a private repo needs GitHub Pro (paid). The app as built keeps all personal data in your browser, so the public code itself reveals nothing personal — *but* ADR-0003's recommended job-fetching Action would publish your company watchlist, and anything you later commit (a résumé JSON, notes) would be world-readable. I did not change visibility: it's your account and an outward-facing change.
- Need: pick a letter (or override — any shape answers)

Options:
- **A — public-code**: Keep the repo public and Pages free. Rule: no personal data is ever committed; the watchlist (ADR-0003) lives in browser storage or a private gist, not the repo.
- **B — private-pro**: Make the repo private and upgrade to GitHub Pro so Pages keeps working. The Pages *site* is still publicly reachable by URL — privacy is of the code/data in the repo, not the site.
- **C — private-elsewhere**: Make the repo private and deploy to a host that serves private repos on a free tier (e.g. Cloudflare Pages or Netlify, connected to the repo). Small workflow change; `vite.config.ts` already accepts `BASE_PATH=/`.
- **D — private-local**: Make the repo private and don't host at all; run `npm run dev` locally.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**C — private-elsewhere.** *Rationale*: your brief said "private" before it said anything else, and ADR-0003's most useful job source (a scheduled watchlist fetch) naturally commits data that reveals where you're applying; C keeps both the code and that data private at zero cost, and the app is host-agnostic (`app/vite.config.ts` reads `BASE_PATH`). A is fine if you never want the Action-fetched jobs. *Confidence*: 0.6 — because it depends on how much you mind a public watchlist and whether "GitHub Pages" was a requirement or just the first host that came to mind. *If wrong*: if GitHub Pages specifically is the requirement (e.g. a course deliverable), flip to **A** with the watchlist kept out of the repo, or **B** if you'll pay.

**ANS:** (by prorick)
A is fine

---

### QST-NEON-PATH: When the harness moves to Neon, what holds the database credentials?
- Status: unanswered
- Why asking: a static site cannot keep a secret — anything shipped to the browser is readable. So "localStorage → Neon" is really "static site → static site + a small authenticated backend". This decides how the async `Collection<T>` interface in `app/src/storage/store.ts` gets its second implementation. No need to build it now; I want the direction so I don't paint us into a corner.
- Need: pick a letter (or override)

Options:
- **A — stay-local**: No Neon until a concrete need appears (most likely: using the harness from a second device). Until then, JSON backup export/import (`app/src/storage/db.ts`) moves data between browsers.
- **B — serverless-proxy**: A tiny serverless function (Cloudflare Worker / Vercel / Netlify function) holds the Neon connection string; the browser authenticates to it (e.g. a GitHub or Google login) and calls a small REST API. Same function can later hold LLM and OAuth secrets (ADR-0004, ADR-0006).
- **C — neon-data-api**: Use Neon's own HTTP data API with its auth integration directly from the browser, with row-level security. Fewer moving parts if it fits; I have **not** verified its current shape and would read Neon's docs before committing to it.

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**A — stay-local**, designed for **B**. *Rationale*: the brief says "for now" local, and the interface is already async with zod validation on every read (`store.ts`), so swapping implementations is a contained change. B is the likely end state because three other ADRs (LLM grading, Gmail OAuth, Reddit API) each want a server-side secret, and one small function can serve all of them. *Confidence*: 0.75 — because the interface already exists and its tests pass; the uncertainty is when you'll need multi-device. *If wrong*: if you want to use the harness from your phone and laptop soon, start **B** now; if Neon's data API turns out to cover auth + RLS cleanly, **C** beats B on maintenance.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

### QST-BACKUP: localStorage can be wiped by the browser or a "clear site data". How hard should the app push backups?
- Status: unanswered
- Why asking: a tracker that silently loses three months of applications is the worst failure this app can have. Today there is an Export/Import button on the Data page and nothing more.
- Need: pick a letter (or override)

Options:
- **A — manual**: Keep the button; trust yourself to use it.
- **B — nudge**: Show a banner when the last export is older than 7 days and there are new records since.
- **C — autosave-file**: Use the File System Access API to autosave to a file you pick (works in Chrome/Edge, not Safari/Firefox).

**Recommendation**: (by Prospector 5.5, Claude Opus 5.5, 2026-11-24)

**B — nudge.** *Rationale*: cheap, works in every browser, and targets the real failure (forgetting), whereas C helps only in Chromium and A relies on memory during a stressful job search. *Confidence*: 0.7 — because this is a UX judgment; I've no data on your habits. *If wrong*: if you live in Chrome and want zero-thought persistence, **C**; if Neon arrives soon (QST-NEON-PATH B), this becomes moot.

**ANS:** (by prorick)
[Fill this in]   <!-- literal placeholder — parser-significant, do not paraphrase -->

---

## Decision

### Context
A personal job-search tool, hosted as static files, with personal data that must survive app upgrades and must not leak into the repo.

### Chosen: static SPA + local-first validated storage

- **Stack**: Vite 8, React 19, TypeScript 7 (strict), in `app/` so product code stays separate from the template substrate at the repo root.
- **Routing**: `HashRouter` — GitHub Pages has no SPA fallback, so `/tracker` would 404 on reload with path routing.
- **Storage** (`app/src/storage/`): `Collection<T>` is **async** although localStorage is sync, so a network-backed implementation drops in without rewriting callers. Every read is validated with zod (`app/src/domain/schemas.ts`). **Records that fail validation are quarantined under their own key, never deleted** — the app shows a banner and lists them on the Data page.
- **Backup**: versioned JSON export/import; import validates the *whole* file before writing anything.
- **Deploy**: `.github/workflows/pages.yml` runs `npm run check` (typecheck + tests + build) on every push/PR; only `main` deploys.

**Rationale**: every piece is the smallest thing that satisfies the brief's constraints while keeping the Neon move a one-file change.

**Trade-offs accepted**: no multi-device sync; ~750 KB main bundle (React + recharts + TanStack), PDF renderer lazy-loaded (~1.2 MB) only when you export a PDF.

### Consequences
- **Repo stays public; hosting is GitHub Pages** (QST-REPO-VISIBILITY = A). Standing rule that follows: **no personal data is ever committed** — no résumé JSON, no application history, no company watchlist. If ADR-0003's watchlist Action is built, the watchlist must live outside the repo (browser storage or a private gist) and the published `jobs.json` must be understood as public.
- Anything needing a secret (LLM key, OAuth client secret, Reddit app) must run in the browser with *your* credentials, in Actions, or wait for QST-NEON-PATH B.
- The verification gate for this repo is `npm --prefix app run check` (CLAUDE.md, Fifth Directive).

---

## Open Follow-ups

- [x] ~~Unverified: the Pages deploy has not run yet~~ — verified 2026-11-24: Pages enabled (source: GitHub Actions), run 45524101788 green (build + deploy), https://prorick.github.io/job-search-harness/ serves the app and its assets under the `/job-search-harness/` base.
- [ ] Concern: localStorage is ~5 MB per origin. Pasted job descriptions are the largest records; at ~5 KB each that's ~1,000 jobs. Move to IndexedDB if we approach it.
- [ ] Future task: `kintsugi.yaml` is present without `kintsugi.lock` — template updates won't reach this repo until someone runs `kintsugi adopt`.

---

## Action Items

- [x] Scaffold `app/` with libraries and storage layer — Owner: Prospector 5.5
- [x] Gated Pages workflow — Owner: Prospector 5.5
- [x] Answer QST-REPO-VISIBILITY (A — public-code) — Owner: prorick
- [x] Enable Pages and deploy — Owner: Prospector 5.5
- [ ] Fill `⟦HUMAN-NAME⟧` in `.vscode/settings.json` — the ADR Manager signed the first answer with the raw placeholder (corrected by hand in Iteration 2) — Owner: prorick (file holds their uncommitted edits)
- [ ] Implement backup nudge per QST-BACKUP — Owner: Prospector 5.5

---

## Iterations

### Iteration 1 (2026-11-24)
- Trigger: founding brief `prompt.txt`
- Contributors: Prospector 5.5 (Claude Opus 5.5)
- Changes: initial draft; stack scaffolded and tested (29 tests) alongside
- Outcome: `Draft → Partially Implemented` (architecture built; hosting/visibility pending answers)

### Iteration 2 (2026-11-24)
- Trigger: prorick answered QST-REPO-VISIBILITY: "A is fine"
- Contributors: prorick, Prospector 5.5 (Claude Opus 5.5)
- Changes: recorded the no-personal-data-in-repo rule as a consequence; Pages enabled and first deploy verified; answer byline corrected from `⟦HUMAN-NAME⟧` (ADR Manager's unfilled placeholder) to `prorick` — the answer text itself is untouched. Note the recommendation was C and the human chose A: the falsifier named "GitHub Pages specifically is the requirement", which the brief's wording supports.
- Outcome: status unchanged (Partially Implemented — QST-NEON-PATH and QST-BACKUP still open)

---

## Links

- Related ADRs: 0002 (PDF), 0003 (job sourcing — watchlist privacy), 0004/0005/0006 (features needing secrets)
- Related code: `app/src/storage/store.ts`, `app/src/storage/db.ts`, `app/src/domain/schemas.ts`, `.github/workflows/pages.yml`
