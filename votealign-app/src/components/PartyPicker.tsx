import { jurisdictions, parties } from '../data'

interface Props {
  party: string
  onChange: (p: string) => void
}

// Only offer parties that actually have members somewhere in the data;
// alignment can't be computed for a party with nobody voting.
const present = new Set(Object.values(jurisdictions).flatMap((j) => j.officials.map((o) => o.party)))
const available = parties.filter((p) => present.has(p.code))

export function PartyPicker({ party, onChange }: Props) {
  return (
    <section className="card">
      <h2 className="h">Pick a party</h2>
      <p className="muted">
        Party alignment is the share of each official's recorded votes that matched how most of
        that party's members in the same chamber voted.
      </p>
      <div className="party-chips" role="radiogroup" aria-label="Party">
        {available.map((p) => (
          <button
            key={p.code}
            role="radio"
            aria-checked={party === p.code}
            className="party-chip"
            style={{ ['--pc' as string]: p.color }}
            onClick={() => onChange(p.code)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </section>
  )
}
