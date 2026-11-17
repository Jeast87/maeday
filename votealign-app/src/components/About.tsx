import type { JurisdictionData } from '../data/types'

export function About({ stateData, federal }: { stateData: JurisdictionData; federal: JurisdictionData }) {
  return (
    <section className="card about">
      <h2 className="h">How this works</h2>
      <p>
        <b>Issue match</b> looks at recorded votes on bills tagged with each topic. A vote counts as
        a match when it moved policy the way you said you wanted. Topics marked "matters a lot"
        count double. Missed votes are not counted.
      </p>
      <p>
        <b>Party alignment</b> is the percentage of an official's yes/no votes that matched the
        majority of the chosen party in the same chamber.
      </p>
      <p className="muted small">
        Scores reflect only the votes in this dataset, not every vote an official has cast or their
        stated positions. VoteAlign is nonpartisan and doesn't endorse candidates.
      </p>
      {[federal, stateData].map((j) => (
        <div key={j.meta.id} className="sources">
          <h3>
            {j.meta.name} data {j.meta.sample ? <span className="tag">Sample</span> : <span className="tag real">Real</span>}
          </h3>
          <p className="muted small">Updated {j.meta.updated}.</p>
          <ul>
            {j.meta.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                {s.note && <span className="muted"> · {s.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
