import { useState } from 'react'
import { exportBackup, importBackup } from '../storage/db'
import { download, useData } from '../state'

export function DataPage() {
  const { db, jobs, applications, resumes, quarantined, reload } = useData()
  const [msg, setMsg] = useState('')
  return (
    <section>
      <h1>Your data</h1>
      <p>
        Everything lives in <strong>this browser's local storage</strong> on this device — {jobs.length} jobs,{' '}
        {applications.length} applications, {resumes.length} résumé(s). Nothing is sent anywhere. Clearing site data or
        switching browsers loses it, so export a backup regularly.
      </p>
      <div className="row">
        <button
          onClick={async () =>
            download(`job-search-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup(db), null, 2), 'application/json')
          }
        >
          Export backup
        </button>
        <label className="button">
          Import backup…
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (!confirm('Replace ALL current data with this backup?')) return
              try {
                const b = await importBackup(db, JSON.parse(await file.text()))
                await reload()
                setMsg(`Imported ${b.jobs.length} jobs, ${b.applications.length} applications.`)
              } catch (x) {
                setMsg(`Import refused, nothing changed: ${x instanceof Error ? x.message : x}`)
              }
            }}
          />
        </label>
      </div>
      {msg && <p>{msg}</p>}
      {quarantined.length > 0 && (
        <>
          <h3>Set-aside records</h3>
          <p className="muted">These failed validation and were moved aside instead of deleted. Keys in local storage:</p>
          <ul>
            {quarantined.map((q) => (
              <li key={q.key}>
                <code>{q.key}</code> — {q.count} record(s)
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
