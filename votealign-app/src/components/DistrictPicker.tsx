import type { JurisdictionData } from '../data/types'

/** chamberKey ("us:house", "tn:upper", ...) -> district, or "" for all. */
export type Districts = Record<string, string>

export const chamberKey = (jurisdictionId: string, chamberId: string) => `${jurisdictionId}:${chamberId}`

function districtsFor(data: JurisdictionData, chamber: string, state: string) {
  const set = new Set<string>()
  for (const o of data.officials) if (o.chamber === chamber && o.state === state && o.district) set.add(o.district)
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

interface Props {
  stateData: JurisdictionData
  federal: JurisdictionData
  value: Districts
  onChange: (d: Districts) => void
}

export function DistrictPicker({ stateData, federal, value, onChange }: Props) {
  const st = stateData.meta.id.toUpperCase()
  const rows = [
    ...federal.meta.chambers.map((c) => ({ j: federal, c })),
    ...stateData.meta.chambers.map((c) => ({ j: stateData, c })),
  ]
    .map(({ j, c }) => ({ key: chamberKey(j.meta.id, c.id), chamber: c, options: districtsFor(j, c.id, st) }))
    .filter((r) => r.options.length > 0)

  return (
    <div className="districts">
      {rows.map((r) => (
        <label key={r.key} className="field">
          <span>{r.chamber.name}</span>
          <select value={value[r.key] ?? ''} onChange={(e) => onChange({ ...value, [r.key]: e.target.value })}>
            <option value="">All districts</option>
            {r.options.map((d) => (
              <option key={d} value={d}>District {d}</option>
            ))}
          </select>
        </label>
      ))}
      <a className="link small" href="https://www.house.gov/representatives/find-your-representative" target="_blank" rel="noreferrer">
        Not sure of your district? Look it up ↗
      </a>
    </div>
  )
}
