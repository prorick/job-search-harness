// The harness's database: one Collection per record type, plus backup export/import.
// Backup matters more than usual here: localStorage is per-browser, per-origin, and can be
// cleared by the browser or the user at any time (ADR-0001, QST-BACKUP).
import { z } from 'zod'
import { Application, Job, Resume } from '../domain/schemas'
import { type Collection, type KeyValueBackend, type QuarantineReport, localCollection } from './store'

export interface Db {
  jobs: Collection<Job>
  applications: Collection<Application>
  resumes: Collection<Resume>
}

export function createDb(backend: KeyValueBackend, onQuarantine?: (r: QuarantineReport) => void): Db {
  return {
    jobs: localCollection(backend, 'jobs', Job, onQuarantine),
    applications: localCollection(backend, 'applications', Application, onQuarantine),
    resumes: localCollection(backend, 'resumes', Resume, onQuarantine),
  }
}

export const Backup = z.object({
  format: z.literal('job-search-harness-backup'),
  version: z.literal(1),
  exportedAt: z.string(),
  jobs: z.array(Job),
  applications: z.array(Application),
  resumes: z.array(Resume),
})
export type Backup = z.infer<typeof Backup>

export async function exportBackup(db: Db): Promise<Backup> {
  return {
    format: 'job-search-harness-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    jobs: await db.jobs.list(),
    applications: await db.applications.list(),
    resumes: await db.resumes.list(),
  }
}

/** Validates the whole file before touching storage: a half-imported backup is worse than none. */
export async function importBackup(db: Db, raw: unknown): Promise<Backup> {
  const backup = Backup.parse(raw)
  await db.jobs.replaceAll(backup.jobs)
  await db.applications.replaceAll(backup.applications)
  await db.resumes.replaceAll(backup.resumes)
  return backup
}
