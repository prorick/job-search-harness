// Visual graph of applications + response-likelihood — ADR-0006 / ADR-0007.
import { useState } from 'react'
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip, type SankeyNodeProps } from 'recharts'
import { funnel, gotResponse } from '../features/tracker/tracker'
import { estimateResponse } from '../features/insights/likelihood'
import { useData } from '../state'

const pct = (x: number) => `${Math.round(x * 100)}%`

// Recharts' default Sankey node is an unlabeled bar; a funnel nobody can read is no funnel.
function FunnelNode({ x, y, width, height, payload }: SankeyNodeProps) {
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill="var(--accent)" fillOpacity={0.9} />
      <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fontSize={13} fill="currentColor">
        {payload.name} ({payload.value})
      </text>
    </Layer>
  )
}

export function InsightsPage() {
  const { applications } = useData()
  const links = funnel(applications)
  const names = [...new Set(links.flatMap((l) => [l.source, l.target]))]
  const data = {
    nodes: names.map((name) => ({ name })),
    links: links.map((l) => ({ source: names.indexOf(l.source), target: names.indexOf(l.target), value: l.value })),
  }
  const sent = applications.filter((a) => a.status !== 'saved')
  const responded = sent.filter(gotResponse).length

  const [cand, setCand] = useState({ matchScore: '', daysSincePosted: '', referral: false })
  const est = estimateResponse(applications, {
    matchScore: cand.matchScore ? Number(cand.matchScore) : undefined,
    daysSincePosted: cand.daysSincePosted ? Number(cand.daysSincePosted) : undefined,
    referral: cand.referral,
  })

  return (
    <section>
      <h1>Insights</h1>
      <p>
        {sent.length} applications · {responded} responses ({sent.length ? pct(responded / sent.length) : '—'})
      </p>
      <h3>Where your applications went</h3>
      {links.length === 0 ? (
        <p className="muted">Track a few applications to see the flow.</p>
      ) : (
        <div style={{ height: 360 }}>
          <ResponsiveContainer>
            <Sankey data={data} nodePadding={30} margin={{ left: 20, right: 120, top: 10, bottom: 10 }} link={{ stroke: '#b8a24a' }} node={FunnelNode}>
              <Tooltip />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}

      <h3>Likely response for a new application</h3>
      <div className="row">
        <input placeholder="Match score" type="number" value={cand.matchScore} onChange={(e) => setCand({ ...cand, matchScore: e.target.value })} />
        <input
          placeholder="Posting age (days)"
          type="number"
          value={cand.daysSincePosted}
          onChange={(e) => setCand({ ...cand, daysSincePosted: e.target.value })}
        />
        <label className="inline">
          <input type="checkbox" checked={cand.referral} onChange={(e) => setCand({ ...cand, referral: e.target.checked })} /> referral
        </label>
      </div>
      <p>
        Estimated response chance: <strong>{pct(est.rate)}</strong> (80% range {pct(est.low)}–{pct(est.high)}), from{' '}
        {est.n} of your past applications ({est.basis === 'comparable' ? 'similar ones' : 'all of them — too few similar ones yet'}
        ) plus a prior. Small samples are noisy — ADR-0007.
      </p>
    </section>
  )
}
