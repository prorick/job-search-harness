// The "spreadsheet" tracker — ADR-0006. TanStack Table v9 for sorting; CSV export for Sheets/Excel.
import { useState } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { type Application, ApplicationStatus } from '../domain/schemas'
import { setStatus, toCsv } from '../features/tracker/tracker'
import { type EmailSuggestion, suggestFromEmail } from '../features/tracker/email'
import { download, useData } from '../state'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime, basic: sortFn_basic },
})
const col = createColumnHelper<typeof features, Application>()

function StatusCell({ app }: { app: Application }) {
  const { db, reload } = useData()
  return (
    <select
      value={app.status}
      onChange={async (e) => {
        await db.applications.upsert(setStatus(app, e.target.value as ApplicationStatus))
        await reload()
      }}
    >
      {ApplicationStatus.options.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  )
}

const columns = col.columns([
  col.accessor('company', { header: 'Company' }),
  col.accessor('title', { header: 'Role' }),
  col.accessor('location', { header: 'Location' }),
  col.accessor('appliedAt', { header: 'Applied', cell: (c) => new Date(c.getValue()).toLocaleDateString() }),
  col.accessor('status', { header: 'Status', cell: (c) => <StatusCell app={c.row.original} /> }),
  col.accessor((a) => a.matchScore ?? -1, { id: 'match', header: 'Match', cell: (c) => (c.getValue() < 0 ? '—' : c.getValue()) }),
  col.accessor((a) => a.daysSincePosted ?? -1, {
    id: 'age',
    header: 'Posting age at apply',
    cell: (c) => (c.getValue() < 0 ? '—' : `${c.getValue()}d`),
  }),
  col.accessor('url', {
    header: 'Link',
    enableSorting: false,
    cell: (c) =>
      c.getValue() ? (
        <a href={c.getValue()} target="_blank" rel="noreferrer">
          ↗
        </a>
      ) : null,
  }),
])

export function TrackerPage() {
  const { applications } = useData()
  const table = useTable({ features, columns, data: applications })

  return (
    <section>
      <div className="row between">
        <h1>Tracker</h1>
        <button onClick={() => download('applications.csv', toCsv(applications), 'text/csv')} disabled={!applications.length}>
          Export CSV
        </button>
      </div>
      <p className="muted">Mark jobs “I applied” on the Jobs tab; they land here. Click a header to sort.</p>
      <div className="scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()} className={h.column.getCanSort() ? 'sortable' : ''}>
                    <table.FlexRender header={h} />
                    {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getAllCells().map((c) => (
                  <td key={c.id}>
                    <table.FlexRender cell={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EmailUpdate />
    </section>
  )
}

function EmailUpdate() {
  const { db, applications, reload } = useData()
  const [text, setText] = useState('')
  const [s, setS] = useState<EmailSuggestion | null | undefined>(undefined)
  return (
    <details className="email">
      <summary>Update from an email</summary>
      <p className="muted">
        Paste a recruiter email. The harness suggests a status change; nothing changes until you confirm. (Inbox
        sync is ADR-0006, QST-EMAIL-SOURCE.)
      </p>
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste email subject + body…" />
      <button onClick={() => setS(suggestFromEmail(text, applications))}>Suggest</button>
      {s === null && <p>No status signal found in that email.</p>}
      {s && (
        <p>
          Looks like <strong>{s.status}</strong> (matched “{s.matchedPhrase}”)
          {s.application ? (
            <>
              {' '}
              for <strong>{s.application.company}</strong> — {s.application.title}.{' '}
              <button
                onClick={async () => {
                  await db.applications.upsert(setStatus(s.application!, s.status, 'email'))
                  await reload()
                  setS(undefined)
                  setText('')
                }}
              >
                Apply update
              </button>
            </>
          ) : (
            ' — but no tracked company name appears in it.'
          )}
        </p>
      )}
    </details>
  )
}
