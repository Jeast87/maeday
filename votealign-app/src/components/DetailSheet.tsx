import { useEffect } from 'react'
import { partyByCode, topics } from '../data'
import type { Mode, Row } from './Results'

const VOTE = { Y: 'Yes', N: 'No', A: 'Absent' } as const

export function DetailSheet({ row, mode, party, onClose }: { row: Row; mode: Mode; party: string; onClose: () => void }) {
  const { official: o, score, data } = row
  const p = partyByCode(o.party)
  const chamber = data.meta.chambers.find((c) => c.id === o.chamber)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden />
        <div className="sheet-head">
          <div>
            <h2 id="sheet-title">
              {o.name} {o.sample && <span className="tag">Sample</span>}
            </h2>
            <div className="muted">
              <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span> · {chamber?.name}
              {o.district ? `, District ${o.district}` : ''}
            </div>
          </div>
          <button className="close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sheet-score">
          <strong>{score.pct === null ? '—' : `${score.pct}%`}</strong>
          <span>
            {mode === 'issues'
              ? `match with your views, from ${score.details.length} votes`
              : `aligned with the ${partyByCode(party).name} majority on ${score.agreed} of ${score.total} votes`}
          </span>
        </div>

        {score.details.length === 0 ? (
          <p className="muted">No recorded votes on these topics yet.</p>
        ) : (
          <ul className="votes">
            {score.details.map((d, i) => {
              const topic = topics.find((t) => t.id === d.topicId)
              return (
                <li key={d.bill.id + i} className={d.agrees ? 'vote agree' : 'vote disagree'}>
                  <span className="vote-mark" aria-label={d.agrees ? 'Agrees' : 'Disagrees'}>{d.agrees ? '✓' : '✕'}</span>
                  <div>
                    <div className="vote-title">
                      {d.bill.url ? <a href={d.bill.url} target="_blank" rel="noreferrer">{d.bill.title}</a> : d.bill.title}
                    </div>
                    <div className="vote-meta">
                      {d.bill.number} · {d.bill.date}
                      {topic ? ` · ${topic.name}` : ''}
                    </div>
                    {d.bill.summary && <div className="vote-summary">{d.bill.summary}</div>}
                    <div className="vote-cast">
                      Voted <b>{VOTE[d.vote]}</b>
                      {d.partyVote && <> · party majority voted <b>{VOTE[d.partyVote]}</b></>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {o.website && (
          <a className="link" href={o.website} target="_blank" rel="noreferrer">Official website ↗</a>
        )}
      </div>
    </div>
  )
}
