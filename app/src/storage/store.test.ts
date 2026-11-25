import { describe, expect, it } from 'vitest'
import { NAMESPACE, memoryBackend } from './store'
import { createDb, exportBackup, importBackup } from './db'
import type { Job } from '../domain/schemas'

const job = (over: Partial<Job> = {}): Job => ({
  id: 'j1',
  title: 'Software Engineer',
  company: 'Acme',
  location: 'Philadelphia, PA',
  remote: 'hybrid',
  role: 'Software Engineer',
  payPeriod: 'year',
  currency: 'USD',
  firstSeenAt: '2026-11-20T12:00:00.000Z',
  url: '',
  source: 'manual',
  description: '',
  ...over,
})

describe('local storage collections', () => {
  it('persists a job across a fresh db instance (what a page reload does)', async () => {
    const backend = memoryBackend()
    await createDb(backend).jobs.upsert(job())
    const reloaded = await createDb(backend).jobs.list()
    expect(reloaded.map((j) => j.company)).toEqual(['Acme'])
  })

  it('upsert edits in place instead of duplicating', async () => {
    const db = createDb(memoryBackend())
    await db.jobs.upsert(job())
    await db.jobs.upsert(job({ title: 'Senior Software Engineer' }))
    expect(await db.jobs.list()).toHaveLength(1)
    expect((await db.jobs.get('j1'))?.title).toBe('Senior Software Engineer')
  })

  it('quarantines a record that no longer validates instead of deleting the user’s data', async () => {
    // Realistic cause: a schema change between app versions, or a hand-edited localStorage value.
    const backend = memoryBackend({
      [`${NAMESPACE}:jobs`]: JSON.stringify([job(), { id: 'broken', title: '' }]),
    })
    const reports: { count: number; key: string }[] = []
    const db = createDb(backend, (r) => reports.push(r))

    const jobs = await db.jobs.list()
    expect(jobs.map((j) => j.id)).toEqual(['j1'])
    expect(reports).toHaveLength(1)
    // The broken record is still recoverable from its quarantine key.
    expect(JSON.parse(backend.getItem(reports[0].key)!)).toEqual([{ id: 'broken', title: '' }])
  })

  it('quarantines unparseable JSON and keeps working', async () => {
    const backend = memoryBackend({ [`${NAMESPACE}:applications`]: '{not json' })
    const db = createDb(backend)
    expect(await db.applications.list()).toEqual([])
    expect(backend.keys().some((k) => k.includes('applications:quarantine'))).toBe(true)
  })
})

describe('backup export / import', () => {
  it('round-trips everything into a different browser', async () => {
    const a = createDb(memoryBackend())
    await a.jobs.upsert(job())
    const file = JSON.parse(JSON.stringify(await exportBackup(a)))

    const b = createDb(memoryBackend())
    await importBackup(b, file)
    expect(await b.jobs.list()).toEqual(await a.jobs.list())
  })

  it('rejects a malformed backup without touching existing data', async () => {
    const db = createDb(memoryBackend())
    await db.jobs.upsert(job())
    await expect(importBackup(db, { format: 'job-search-harness-backup', version: 1, jobs: 'nope' })).rejects.toThrow()
    expect(await db.jobs.list()).toHaveLength(1)
  })
})
