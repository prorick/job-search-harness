import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { scoreResume } from '../features/scoring/match'
import { useData } from '../state'

export function ScorePage() {
  const { jobs, resumes } = useData()
  const [params] = useSearchParams()
  const job = jobs.find((j) => j.id === params.get('job'))
  const [jd, setJd] = useState('')
  const text = jd || job?.description || ''
  const resume = resumes[0]
  const result = useMemo(() => (resume && text ? scoreResume(resume, text) : null), [resume, text])

  return (
    <section>
      <h1>Score résumé vs job</h1>
      {job && (
        <p>
          Scoring against <strong>{job.title}</strong> · {job.company}
        </p>
      )}
      {!resume && <p className="danger">Save a résumé first (Résumé tab).</p>}
      <textarea
        rows={8}
        placeholder="Paste a job description…"
        value={text}
        onChange={(e) => setJd(e.target.value)}
      />
      {result && (
        <div className="score">
          <div className={`big ${result.score >= 70 ? 'ok' : result.score >= 45 ? 'mid' : 'low'}`}>{result.score}</div>
          <p className="muted">
            Weighted share of the description's repeated terms that appear in your résumé. A keyword baseline, not a
            verdict — see ADR-0004.
          </p>
          <div className="two">
            <div>
              <h3>Present</h3>
              <p>{result.matched.map((k) => k.term).join(', ') || '—'}</p>
            </div>
            <div>
              <h3>Missing</h3>
              <p>{result.missing.map((k) => k.term).join(', ') || '—'}</p>
            </div>
          </div>
          <h3>Feedback</h3>
          <ul>
            {result.findings.map((f, i) => (
              <li key={i} className={f.severity === 'fix' ? 'danger' : ''}>
                {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
