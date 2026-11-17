import { topics } from '../data'
import type { Prefs } from '../lib/scoring'

interface Props {
  prefs: Prefs
  onChange: (p: Prefs) => void
}

export function TopicPicker({ prefs, onChange }: Props) {
  const set = (id: string, stance: 1 | -1 | null) => {
    const next = { ...prefs }
    if (stance === null || prefs[id]?.stance === stance) delete next[id]
    else next[id] = { stance, weight: prefs[id]?.weight ?? 1 }
    onChange(next)
  }
  const toggleWeight = (id: string) => {
    const p = prefs[id]
    if (!p) return
    onChange({ ...prefs, [id]: { ...p, weight: p.weight === 2 ? 1 : 2 } })
  }
  const count = Object.keys(prefs).length

  return (
    <section className="card">
      <div className="row-between">
        <h2 className="h">Your views</h2>
        {count > 0 && (
          <button className="link small" onClick={() => onChange({})}>Clear all</button>
        )}
      </div>
      <p className="muted">Answer the topics you care about and skip the rest.</p>
      <ul className="topics">
        {topics.map((t) => {
          const p = prefs[t.id]
          return (
            <li key={t.id} className={p ? 'topic on' : 'topic'}>
              <div className="topic-head">
                <span className="topic-icon" aria-hidden>{t.icon}</span>
                <div>
                  <div className="topic-name">{t.name}</div>
                  <div className="topic-statement">{t.statement}</div>
                </div>
              </div>
              <div className="topic-actions">
                <div className="seg" role="group" aria-label={`Your view on ${t.name}`}>
                  <button aria-pressed={p?.stance === 1} className="agree" onClick={() => set(t.id, 1)}>Agree</button>
                  <button aria-pressed={p?.stance === -1} className="disagree" onClick={() => set(t.id, -1)}>Disagree</button>
                </div>
                <label className={p ? 'weight' : 'weight disabled'}>
                  <input type="checkbox" disabled={!p} checked={p?.weight === 2} onChange={() => toggleWeight(t.id)} />
                  Matters a lot
                </label>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
