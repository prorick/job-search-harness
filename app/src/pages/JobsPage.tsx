import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { type Application, type Job, RemotePolicy, newId, nowIso } from '../domain/schemas'
import { type JobFilter, ageInDays, annualPayCeiling, filterJobs, freshness } from '../features/jobs/filter'
import { scoreResume } from '../features/scoring/match'
import { redditSearches } from '../features/intel/reddit'
import { useData } from '../state'

const money = (n: number) => `$${Math.round(n / 1000)}k`

function payLabel(j: Job): string {
  if (j.payMin === undefined && j.payMax === undefined) return 'pay not listed'
  const unit = j.payPeriod === 'hour' ? '/h' : ''
  const f = (n: number) => (j.payPeriod === 'hour' ? `$${n}` : money(n))
  const band = [j.payMin, j.payMax].filter((x) => x !== undefined).map((x) => f(x!)).join('–')
  const annual = annualPayCeiling(j)
  return j.payPeriod === 'hour' && annual ? `${band}${unit} (≈${money(annual)}/yr)` : `${band}${unit}`
}

export function JobsPage() {
  const { db, jobs, applications, resumes, reload } = useData()
  const [f, setF] = useState<JobFilter>({ includeUnknownPay: true })
  const [showAdd, setShowAdd] = useState(jobs.length === 0)
  const [intelFor, setIntelFor] = useState<string | null>(null)
  const roles = useMemo(() => [...new Set(jobs.map((j) => j.role).filter(Boolean))].sort(), [jobs])
  const shown = useMemo(() => filterJobs(jobs, f), [jobs, f])
  const tracked = new Set(applications.map((a) => a.jobId))

  async function track(j: Job) {
    const resume = resumes[0]
    const app: Application = {
      id: newId(),
      jobId: j.id,
      company: j.company,
      title: j.title,
      location: j.location,
      url: j.url,
      appliedAt: nowIso(),
      status: 'applied',
      history: [{ status: 'applied', at: nowIso(), via: 'manual' }],
      resumeId: resume?.id,
      matchScore: resume && j.description ? scoreResume(resume, j.description).score : undefined,
      daysSincePosted: Math.round(ageInDays(j)),
      referral: false,
      notes: '',
    }
    await db.applications.upsert(app)
    await reload()
  }

  return (
    <section>
      <div className="row between">
        <h1>Jobs</h1>
        <button onClick={() => setShowAdd((s) => !s)}>{showAdd ? 'Close' : '+ Add job'}</button>
      </div>
      {showAdd && <AddJob onDone={() => setShowAdd(false)} />}

      <fieldset className="filters">
        <input placeholder="Title or company…" value={f.text ?? ''} onChange={(e) => setF({ ...f, text: e.target.value })} />
        <select value={f.roles?.[0] ?? ''} onChange={(e) => setF({ ...f, roles: e.target.value ? [e.target.value] : [] })}>
          <option value="">Any role</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min pay ($/yr)"
          value={f.minPay ?? ''}
          onChange={(e) => setF({ ...f, minPay: e.target.value ? Number(e.target.value) : undefined })}
        />
        <label className="inline">
          <input type="checkbox" checked={f.includeUnknownPay ?? true} onChange={(e) => setF({ ...f, includeUnknownPay: e.target.checked })} />
          incl. unlisted pay
        </label>
        <input
          placeholder="Locations (comma-sep)"
          value={(f.locations ?? []).join(',')}
          onChange={(e) => setF({ ...f, locations: e.target.value.split(',').map((s) => s.trim()) })}
        />
        <select
          value={f.remote?.[0] ?? ''}
          onChange={(e) => setF({ ...f, remote: e.target.value ? [e.target.value as RemotePolicy] : [] })}
        >
          <option value="">Any workplace</option>
          {RemotePolicy.options.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={f.postedWithinDays ?? ''}
          onChange={(e) => setF({ ...f, postedWithinDays: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Posted any time</option>
          <option value="3">Last 3 days</option>
          <option value="7">Last week</option>
          <option value="14">Last 2 weeks</option>
          <option value="30">Last month</option>
        </select>
      </fieldset>

      <p className="muted">
        {shown.length} of {jobs.length} jobs, freshest first.
      </p>
      <ul className="cards">
        {shown.map((j) => (
          <li key={j.id} className="card">
            <div className="row between">
              <div>
                <span className={`badge ${freshness(j)}`}>{freshness(j)}</span>{' '}
                <strong>{j.title}</strong> · {j.company}
              </div>
              <span className="muted">{Math.round(ageInDays(j))}d ago</span>
            </div>
            <div className="muted">
              {[j.location, j.remote !== 'unknown' ? j.remote : '', j.role, payLabel(j)].filter(Boolean).join(' · ')}
            </div>
            <div className="row">
              {j.url && (
                <a href={j.url} target="_blank" rel="noreferrer">
                  Posting ↗
                </a>
              )}
              <Link to={`/score?job=${j.id}`}>Score résumé</Link>
              <button className="link" onClick={() => setIntelFor(intelFor === j.id ? null : j.id)}>
                Reddit intel
              </button>
              {tracked.has(j.id) ? (
                <span className="muted">✓ tracked</span>
              ) : (
                <button onClick={() => track(j)}>I applied</button>
              )}
              <button className="link danger" onClick={async () => (await db.jobs.remove(j.id), reload())}>
                Delete
              </button>
            </div>
            {intelFor === j.id && (
              <ul className="intel">
                {redditSearches(j.company, j.title).map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function AddJob({ onDone }: { onDone: () => void }) {
  const { db, reload } = useData()
  const [err, setErr] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const s = (k: string) => String(fd.get(k) ?? '').trim()
    const n = (k: string) => (s(k) ? Number(s(k)) : undefined)
    const job: Job = {
      id: newId(),
      title: s('title'),
      company: s('company'),
      location: s('location'),
      remote: s('remote') as RemotePolicy,
      role: s('role'),
      payMin: n('payMin'),
      payMax: n('payMax'),
      payPeriod: s('payPeriod') === 'hour' ? 'hour' : 'year',
      currency: 'USD',
      postedAt: s('postedAt') ? new Date(s('postedAt')).toISOString() : undefined,
      firstSeenAt: nowIso(),
      url: s('url'),
      source: 'manual',
      description: s('description'),
    }
    try {
      await db.jobs.upsert(job)
      await reload()
      onDone()
    } catch (x) {
      setErr(String(x))
    }
  }
  return (
    <form className="add" onSubmit={submit}>
      <input name="title" placeholder="Title *" required />
      <input name="company" placeholder="Company *" required />
      <input name="role" placeholder="Role family (e.g. Backend, Data)" />
      <input name="location" placeholder="Location" />
      <select name="remote" defaultValue="unknown">
        {RemotePolicy.options.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <input name="payMin" type="number" placeholder="Pay min" />
      <input name="payMax" type="number" placeholder="Pay max" />
      <select name="payPeriod" defaultValue="year">
        <option value="year">per year</option>
        <option value="hour">per hour</option>
      </select>
      <label>
        Posted on <input name="postedAt" type="date" />
      </label>
      <input name="url" type="url" placeholder="Posting URL" />
      <textarea name="description" placeholder="Paste the job description (used for scoring)" rows={6} />
      {err && <p className="danger">{err}</p>}
      <button type="submit">Save job</button>
    </form>
  )
}
