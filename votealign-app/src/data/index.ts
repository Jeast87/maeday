import type { Jurisdiction, JurisdictionData, Official, Bill, VoteMatrix, Topic, Party } from './types'
import topicsJson from './topics.json'
import partiesJson from './parties.json'

export const topics = topicsJson as Topic[]
export const parties = partiesJson as Party[]

// Every folder in ./jurisdictions is picked up at build time. Adding a state
// means adding a folder with meta.json, officials.json, bills.json and votes.json.
const files = import.meta.glob('./jurisdictions/*/*.json', { eager: true, import: 'default' })

function load(): Record<string, JurisdictionData> {
  const out: Record<string, Partial<JurisdictionData>> = {}
  for (const [path, data] of Object.entries(files)) {
    const m = path.match(/\.\/jurisdictions\/([^/]+)\/(\w+)\.json$/)
    if (!m) continue
    const [, id, kind] = m
    const entry = (out[id] ??= {})
    if (kind === 'meta') entry.meta = data as Jurisdiction
    else if (kind === 'officials') entry.officials = data as Official[]
    else if (kind === 'bills') entry.bills = data as Bill[]
    else if (kind === 'votes') entry.votes = data as VoteMatrix
  }
  const complete: Record<string, JurisdictionData> = {}
  for (const [id, e] of Object.entries(out)) {
    if (e.meta && e.officials && e.bills && e.votes) complete[id] = e as JurisdictionData
    else console.warn(`Jurisdiction "${id}" is missing one of meta/officials/bills/votes and was skipped.`)
  }
  return complete
}

export const jurisdictions = load()
export const federal = jurisdictions.us

/** States with their own data folder, alphabetical. */
export const states = Object.values(jurisdictions)
  .filter((j) => j.meta.level === 'state')
  .sort((a, b) => a.meta.name.localeCompare(b.meta.name))

export const partyByCode = (code: string): Party =>
  parties.find((p) => p.code === code) ?? { code, name: code, color: '#6b7280' }
