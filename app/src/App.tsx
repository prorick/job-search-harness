import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { DataProvider, useData } from './state'
import { JobsPage } from './pages/JobsPage'
import { ResumePage } from './pages/ResumePage'
import { ScorePage } from './pages/ScorePage'
import { TrackerPage } from './pages/TrackerPage'
import { InsightsPage } from './pages/InsightsPage'
import { DataPage } from './pages/DataPage'

// HashRouter: GitHub Pages serves static files only and has no SPA fallback, so deep links
// like /tracker would 404 with path-based routing (ADR-0001).
export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <header className="top">
          <strong className="brand">Job Search Harness</strong>
          <nav>
            <NavLink to="/" end>Jobs</NavLink>
            <NavLink to="/tracker">Tracker</NavLink>
            <NavLink to="/score">Score</NavLink>
            <NavLink to="/resume">Résumé</NavLink>
            <NavLink to="/insights">Insights</NavLink>
            <NavLink to="/data">Data</NavLink>
          </nav>
        </header>
        <QuarantineBanner />
        <main>
          <Routes>
            <Route path="/" element={<JobsPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/score" element={<ScorePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/data" element={<DataPage />} />
          </Routes>
        </main>
      </HashRouter>
    </DataProvider>
  )
}

function QuarantineBanner() {
  const { quarantined } = useData()
  if (quarantined.length === 0) return null
  return (
    <div className="banner warn" role="alert">
      {quarantined.reduce((n, q) => n + q.count, 0)} stored record(s) failed validation and were set aside (not deleted).
      See the Data page.
    </div>
  )
}
