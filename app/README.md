# job-search-harness app

The web app half of the harness — architecture in [`docs/adr/0001-*`](../docs/adr/).

```bash
npm install
npm run dev      # http://localhost:5173/job-search-harness/
npm run check    # the verification gate: typecheck + tests + build (CI runs the same)
```

| Path | What |
|---|---|
| `src/domain/schemas.ts` | zod schemas for jobs, applications, résumés — the source of truth |
| `src/storage/` | async `Collection<T>` over localStorage; quarantine-not-delete; backup import/export |
| `src/features/jobs/` | filters (title/role/pay/location/workplace/recency) — ADR-0003 |
| `src/features/scoring/` | résumé ↔ job-description keyword score + ATS checks — ADR-0004 |
| `src/features/intel/` | Reddit search links — ADR-0005 |
| `src/features/tracker/` | status history, funnel, CSV, email → status suggestions — ADR-0006 |
| `src/features/insights/` | response-likelihood estimate — ADR-0007 |
| `src/pdf/` | résumé PDF via `@react-pdf/renderer` (lazy-loaded) — ADR-0002 |
| `src/pages/` | one component per tab |

All data stays in your browser. Export a backup from the **Data** tab.
