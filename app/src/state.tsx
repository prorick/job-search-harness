// App-wide data hook: one Db, loaded into React state, with a reload after every write.
// Small data (hundreds of records), so whole-collection reloads are fine — see ADR-0001.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Application, Job, Resume } from './domain/schemas'
import { type Db, createDb } from './storage/db'
import { type QuarantineReport, browserBackend } from './storage/store'

interface AppData {
  db: Db
  jobs: Job[]
  applications: Application[]
  resumes: Resume[]
  quarantined: QuarantineReport[]
  reload: () => Promise<void>
}

const Ctx = createContext<AppData | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [quarantined, setQuarantined] = useState<QuarantineReport[]>([])
  const db = useMemo(() => createDb(browserBackend(), (r) => setQuarantined((q) => [...q, r])), [])
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])

  const reload = useCallback(async () => {
    const [j, a, r] = await Promise.all([db.jobs.list(), db.applications.list(), db.resumes.list()])
    setJobs(j)
    setApplications(a)
    setResumes(r)
  }, [db])

  useEffect(() => {
    void reload()
  }, [reload])

  return <Ctx.Provider value={{ db, jobs, applications, resumes, quarantined, reload }}>{children}</Ctx.Provider>
}

export function useData(): AppData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}

export function download(filename: string, content: Blob | string, type = 'application/octet-stream') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
