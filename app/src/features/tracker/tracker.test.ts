import { describe, expect, it } from 'vitest'
import { funnel, furthestStage, gotResponse, setStatus, toCsv } from './tracker'
import { classifyEmail, suggestFromEmail } from './email'
import type { Application } from '../../domain/schemas'

const app = (id: string, over: Partial<Application> = {}): Application => ({
  id,
  company: 'Acme',
  title: 'Software Engineer',
  location: '',
  url: '',
  appliedAt: '2026-11-01T00:00:00.000Z',
  status: 'applied',
  history: [{ status: 'applied', at: '2026-11-01T00:00:00.000Z', via: 'manual' }],
  referral: false,
  notes: '',
  ...over,
})

const walk = (a: Application, ...steps: Application['status'][]) => steps.reduce((x, s) => setStatus(x, s), a)

describe('status history', () => {
  it('remembers an interview after the application is rejected', () => {
    const a = walk(app('a'), 'screen', 'interview', 'rejected')
    expect(a.status).toBe('rejected')
    expect(furthestStage(a)).toBe('interview')
    // A rejection after an interview IS a response — it must count for ADR-0007's analysis.
    expect(gotResponse(a)).toBe(true)
  })

  it('does not count a straight rejection as a response', () => {
    expect(gotResponse(walk(app('b'), 'rejected'))).toBe(false)
  })
})

describe('funnel', () => {
  it('counts how far each application got and how it ended', () => {
    const links = funnel([
      walk(app('1'), 'screen', 'interview', 'rejected'),
      walk(app('2'), 'rejected'),
      app('3'),
      walk(app('4'), 'screen', 'interview', 'offer'),
      app('saved', { status: 'saved', history: [] }),
    ])
    const v = (s: string, t: string) => links.find((l) => l.source === s && l.target === t)?.value
    expect(v('applied', 'screen')).toBe(2)
    expect(v('screen', 'interview')).toBe(2)
    expect(v('interview', 'rejected')).toBe(1)
    expect(v('interview', 'offer')).toBe(1)
    expect(v('applied', 'rejected')).toBe(1)
    expect(v('applied', 'awaiting')).toBe(1)
  })
})

describe('CSV export', () => {
  it('quotes commas and quotes so the sheet opens with columns intact', () => {
    const csv = toCsv([app('1', { company: 'Acme, Inc.', notes: 'said "great fit"' })])
    expect(csv.split('\r\n')[1]).toContain('"Acme, Inc."')
    expect(csv).toContain('"said ""great fit"""')
  })
})

describe('email classification', () => {
  it('reads a post-interview rejection as a rejection, not an interview', () => {
    const email = 'Thank you for taking the time to interview with us. Unfortunately, we have decided to move forward with other candidates.'
    expect(classifyEmail(email)?.status).toBe('rejected')
  })

  it('reads an offer as an offer even when it mentions the interviews', () => {
    expect(classifyEmail('After your final round interviews, we are pleased to extend an offer!')?.status).toBe('offer')
  })

  it('routes the email to the right application when several companies are tracked', () => {
    const apps = [app('a', { company: 'Acme' }), app('g', { company: 'Globex', title: 'Data Engineer' })]
    const s = suggestFromEmail('Globex Recruiting: can we schedule a recruiter call for the Data Engineer role?', apps)
    expect(s?.status).toBe('screen')
    expect(s?.application?.id).toBe('g')
  })
})
