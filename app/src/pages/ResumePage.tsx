// Résumé editor — phase 1 is a validated JSON editor plus PDF export (ADR-0002, QST-RESUME-EDITOR).
import { useEffect, useState } from 'react'
import { type Resume, newId, nowIso, Resume as ResumeSchema } from '../domain/schemas'
import { atsFindings } from '../features/scoring/match'
import { download, useData } from '../state'

// The PDF renderer is ~1.2 MB; load it only when the user asks for a PDF.
const resumePdfBlob = async (r: Resume) => (await import('../pdf/ResumeDocument')).resumePdfBlob(r)

export const SAMPLE_RESUME = (): Resume => ({
  id: newId(),
  label: 'Main résumé',
  updatedAt: nowIso(),
  basics: { name: 'Your Name', email: 'you@example.com', phone: '', location: 'City, ST', links: ['github.com/you'] },
  summary: 'One or two lines on what you do and what you want next.',
  experience: [
    {
      company: 'Company',
      title: 'Software Engineer',
      location: 'City, ST',
      start: '2024-06',
      end: '',
      bullets: ['Built X that did Y, measured by Z (e.g. cut latency 30%).'],
    },
  ],
  education: [{ school: 'University', degree: 'B.S. Computer Science', start: '2020', end: '2024', details: [] }],
  projects: [],
  skills: [{ group: 'Languages', items: ['TypeScript', 'Python'] }],
})

export function ResumePage() {
  const { db, resumes, reload } = useData()
  const current = resumes[0]
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setText(JSON.stringify(current ?? SAMPLE_RESUME(), null, 2))
  }, [current])

  const parsed = (() => {
    try {
      const r = ResumeSchema.safeParse(JSON.parse(text))
      return r.success ? r.data : null
    } catch {
      return null
    }
  })()

  async function save() {
    try {
      const r = ResumeSchema.parse({ ...JSON.parse(text), updatedAt: nowIso() })
      await db.resumes.upsert(r)
      await reload()
      setErr('')
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x))
    }
  }

  return (
    <section>
      <h1>Résumé</h1>
      <p className="muted">
        Edit as JSON for now (a form editor is planned — ADR-0002). Stored only in this browser.
      </p>
      <div className="two">
        <textarea className="code" value={text} onChange={(e) => setText(e.target.value)} rows={30} spellCheck={false} />
        <div>
          <div className="row">
            <button onClick={save} disabled={!parsed}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
            <button
              disabled={!parsed}
              onClick={async () => parsed && download(`${parsed.basics.name || 'resume'}.pdf`.replace(/\s+/g, '_'), await resumePdfBlob(parsed))}
            >
              Download PDF
            </button>
          </div>
          {!parsed && <p className="danger">Not valid résumé JSON yet.</p>}
          {err && <pre className="danger">{err}</pre>}
          {parsed && (
            <>
              <h3>ATS checks</h3>
              <ul>
                {atsFindings(parsed).map((f, i) => (
                  <li key={i} className={f.severity === 'fix' ? 'danger' : ''}>
                    {f.message}
                  </li>
                ))}
                {atsFindings(parsed).length === 0 && <li>No structural issues found.</li>}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
