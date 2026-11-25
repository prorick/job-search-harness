import { describe, expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResumeDocument } from './ResumeDocument'
import type { Resume } from '../domain/schemas'

// A résumé long enough to spill onto a second page, with the characters real résumés carry
// (accents, en dashes, bullets, ampersands) — the cases where PDF font encoding breaks first.
const longResume: Resume = {
  id: 'r',
  label: 'Main',
  updatedAt: '2026-11-24T00:00:00.000Z',
  basics: { name: 'José Núñez', email: 'jose@example.com', phone: '555-0100', location: 'Philadelphia, PA', links: ['github.com/jose', 'https://jose.dev'] },
  summary: 'Backend engineer — distributed systems & data pipelines.',
  experience: Array.from({ length: 8 }, (_, i) => ({
    company: `Company ${i}`,
    title: 'Software Engineer',
    location: 'Remote',
    start: `20${10 + i}-01`,
    end: i === 0 ? '' : `20${11 + i}-01`,
    bullets: Array.from({ length: 4 }, (_, k) => `Shipped feature ${k} that cut p99 latency 30% for 2M users/day – measured & verified.`),
  })),
  education: [{ school: 'University of Pennsylvania', degree: 'M.S.E. Computer Science', start: '2024', end: '2026', details: [] }],
  projects: [{ name: 'job-search-harness', url: '', bullets: ['Local-first job tracker.'] }],
  skills: [{ group: 'Languages', items: ['TypeScript', 'Python', 'C++'] }],
}

describe('résumé PDF', () => {
  it('renders a realistic multi-page résumé to a valid PDF', async () => {
    const buf = await renderToBuffer(<ResumeDocument resume={longResume} />)
    const head = buf.subarray(0, 5).toString('latin1')
    expect(head).toBe('%PDF-')
    const pages = buf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []
    expect(pages.length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
