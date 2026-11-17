import { useMemo, useState } from 'react'
import type { JurisdictionData, Official } from '../data/types'
import { partyByCode } from '../data'
import { partyAlignment, topicMatch, type MajorityCache, type Prefs, type Score } from '../lib/scoring'
import { chamberKey, type Districts } from './DistrictPicker'
import { DetailSheet } from './DetailSheet'

export type Mode = 'issues' | 'party'

interface Props {
  mode: Mode
  prefs: Prefs
  party: string
  stateData: JurisdictionData
  federal: JurisdictionData
  districts: Districts
}

export interface Row {
  official: Official
  data: JurisdictionData
  score: Score
}

interface Group {
  key: string
  level: string
  title: string
  rows: Row[]
}

const PREVIEW = 5

export function Results({ mode, prefs, party, stateData, federal, districts }: Props) {
  const [open, setOpen] = useState<Row | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const st = stateData.meta.id.toUpperCase()
  const hasPrefs = Object.keys(prefs).length > 0

  const groups = useMemo<Group[]>(() => {
    const cache: MajorityCache = new Map()
    const out: Group[] = []
    for (const data of [federal, stateData]) {
      const chambers = [...data.meta.chambers].sort((a, b) => a.order - b.order)
      for (const c of chambers) {
        const key = chamberKey(data.meta.id, c.id)
        const district = districts[key]
        const rows = data.officials
          .filter((o) => o.chamber === c.id && o.state === st && (!district || o.district === district))
          .map((official) => ({
            official,
            data,
            score: mode === 'issues' ? topicMatch(official, data, prefs) : partyAlignment(official, data, party, cache),
          }))
          .sort((a, b) => (b.score.pct ?? -1) - (a.score.pct ?? -1) || a.official.name.localeCompare(b.official.name))
        if (rows.length) out.push({ key, level: data.meta.level === 'federal' ? 'Federal' : stateData.meta.name, title: c.name, rows })
      }
    }
    return out
  }, [mode, prefs, party, stateData, federal, districts, st])

  const p = partyByCode(party)

  return (
    <section className="results" aria-live="polite">
      <h2 className="h results-title">
        {mode === 'issues' ? 'Your matches' : (
          <>Alignment with <span style={{ color: p.color }}>{p.name}</span> majority</>
        )}
      </h2>

      {mode === 'issues' && !hasPrefs ? (
        <div className="empty">Answer at least one topic above to see how each official's votes line up with your views.</div>
      ) : (
        groups.map((g) => {
          const showAll = expanded[g.key] || g.rows.length <= PREVIEW + 1
          const visible = showAll ? g.rows : g.rows.slice(0, PREVIEW)
          return (
            <div key={g.key} className="group">
              <div className="group-head">
                <span className="eyebrow">{g.level}</span>
                <h3>{g.title}</h3>
              </div>
              <ul className="officials">
                {visible.map((r) => (
                  <li key={r.official.id}>
                    <OfficialCard row={r} onOpen={() => setOpen(r)} />
                  </li>
                ))}
              </ul>
              {!showAll && (
                <button className="more" onClick={() => setExpanded({ ...expanded, [g.key]: true })}>
                  Show all {g.rows.length}
                </button>
              )}
            </div>
          )
        })
      )}

      {open && <DetailSheet row={open} mode={mode} party={party} onClose={() => setOpen(null)} />}
    </section>
  )
}

function scoreColor(pct: number | null) {
  if (pct === null) return 'var(--muted)'
  if (pct >= 70) return 'var(--good)'
  if (pct >= 40) return 'var(--mid)'
  return 'var(--bad)'
}

function OfficialCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const { official: o, score } = row
  const party = partyByCode(o.party)
  return (
    <button className="official" onClick={onOpen}>
      <span className="avatar" style={{ background: party.color }} aria-hidden>
        {o.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
      </span>
      <span className="o-main">
        <span className="o-name">
          {o.name}
          {o.sample && <span className="tag">Sample</span>}
        </span>
        <span className="o-sub">
          {party.name}
          {o.district ? ` · District ${o.district}` : ''}
          {score.pct !== null && ` · ${score.details.length} votes`}
        </span>
        <span className="bar" aria-hidden>
          <span style={{ width: `${score.pct ?? 0}%`, background: scoreColor(score.pct) }} />
        </span>
      </span>
      <span className="o-score" style={{ color: scoreColor(score.pct) }}>
        {score.pct === null ? <span className="na">No votes</span> : `${score.pct}%`}
      </span>
    </button>
  )
}
