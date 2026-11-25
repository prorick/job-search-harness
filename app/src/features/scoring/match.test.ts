import { describe, expect, it } from 'vitest'
import { extractKeywords, scoreResume, tokenize } from './match'
import type { Resume } from '../../domain/schemas'

const resume = (over: Partial<Resume> = {}): Resume => ({
  id: 'r1',
  label: 'Main',
  updatedAt: '2026-11-24T00:00:00.000Z',
  basics: { name: 'Pat Doe', email: 'pat@example.com', phone: '555-0100', location: 'Philadelphia, PA', links: [] },
  summary: 'Backend engineer focused on distributed systems.',
  experience: [
    {
      company: 'Acme',
      title: 'Software Engineer',
      location: '',
      start: '2023-06',
      end: '',
      bullets: ['Built Python and PostgreSQL services handling 2M requests/day', 'Cut deploy time 40% with Kubernetes'],
    },
  ],
  education: [],
  projects: [],
  skills: [{ group: 'Languages', items: ['Python', 'C++', 'SQL'] }],
  ...over,
})

const JD = `We are hiring a backend engineer. You will build Python services on Kubernetes and
PostgreSQL. Python is our main language; Kubernetes runs everything. Experience with Kafka
and Kafka Streams is a plus, and distributed systems knowledge is essential. Terraform and Terraform
Cloud manage our infra.`

describe('tokenize', () => {
  it('keeps tech spellings intact', () => {
    expect(tokenize('C++, C#, Node.js and CI/CD')).toEqual(['c++', 'c#', 'node.js', 'and', 'ci/cd'])
  })
})

describe('scoreResume', () => {
  it('names the JD terms the résumé is missing', () => {
    const r = scoreResume(resume(), JD)
    const missing = r.missing.map((k) => k.term)
    expect(missing).toContain('kafka')
    expect(missing).toContain('terraform')
    expect(r.matched.map((k) => k.term)).toEqual(expect.arrayContaining(['python', 'kubernetes', 'distributed systems']))
  })

  it('scores higher after the user truthfully adds the missing skills', () => {
    const before = scoreResume(resume(), JD).score
    const after = scoreResume(resume({ skills: [{ group: 'Infra', items: ['Python', 'Kafka', 'Terraform'] }] }), JD).score
    expect(after).toBeGreaterThan(before)
  })

  it('does not reward stopword noise that every JD repeats', () => {
    const terms = extractKeywords(JD).map((k) => k.term)
    expect(terms).not.toContain('and')
    expect(terms).not.toContain('experience')
  })
})

describe('ATS findings', () => {
  it('flags a missing email and undated roles — the fields ATS parsers extract first', () => {
    const r = scoreResume(
      resume({
        basics: { name: 'Pat', email: '', phone: '', location: '', links: [] },
        experience: [{ company: 'Acme', title: 'Engineer', location: '', start: '', end: '', bullets: ['Did things'] }],
      }),
      JD,
    )
    const fixes = r.findings.filter((f) => f.severity === 'fix').map((f) => f.message)
    expect(fixes.some((m) => m.includes('email'))).toBe(true)
    expect(fixes.some((m) => m.includes('start date'))).toBe(true)
  })
})
