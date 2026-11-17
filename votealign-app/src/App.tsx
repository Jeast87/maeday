import { useEffect, useMemo, useState } from 'react'
import { federal, jurisdictions, states } from './data'
import type { Prefs } from './lib/scoring'
import { TopicPicker } from './components/TopicPicker'
import { PartyPicker } from './components/PartyPicker'
import { DistrictPicker, type Districts } from './components/DistrictPicker'
import { Results, type Mode } from './components/Results'
import { About } from './components/About'

interface Saved {
  stateId: string
  mode: Mode
  prefs: Prefs
  party: string
  districts: Record<string, Districts>
}

const KEY = 'votealign:v1'
function loadSaved(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const saved = useMemo(loadSaved, [])
  const [stateId, setStateId] = useState(
    saved.stateId && jurisdictions[saved.stateId] ? saved.stateId : states[0]?.meta.id,
  )
  const [mode, setMode] = useState<Mode>(saved.mode ?? 'issues')
  const [prefs, setPrefs] = useState<Prefs>(saved.prefs ?? {})
  const [party, setParty] = useState(saved.party ?? 'D')
  const [allDistricts, setAllDistricts] = useState<Record<string, Districts>>(saved.districts ?? {})

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ stateId, mode, prefs, party, districts: allDistricts }))
    } catch {
      /* storage unavailable: preferences just won't persist */
    }
  }, [stateId, mode, prefs, party, allDistricts])

  const state = jurisdictions[stateId]
  const districts = allDistricts[stateId] ?? {}
  const anySample = federal?.meta.sample || state?.meta.sample

  if (!state || !federal) {
    return <main className="wrap"><p>No data found. Run <code>npm run data:sample</code>.</p></main>
  }

  return (
    <>
      <header className="top">
        <div className="wrap top-inner">
          <div className="brand-wrap">
            <a className="home-link" href="../">← The MAEday Foundation</a>
            <span className="brand">Voter Guide</span>
          </div>
          <label className="state-select">
            <span className="sr-only">State</span>
            <select value={stateId} onChange={(e) => setStateId(e.target.value)}>
              {states.map((s) => (
                <option key={s.meta.id} value={s.meta.id}>{s.meta.name}</option>
              ))}
            </select>
          </label>
        </div>
        <nav className="wrap tabs" role="tablist" aria-label="How to compare">
          <button role="tab" aria-selected={mode === 'issues'} onClick={() => setMode('issues')}>
            By issue
          </button>
          <button role="tab" aria-selected={mode === 'party'} onClick={() => setMode('party')}>
            By party
          </button>
        </nav>
      </header>

      <main className="wrap">
        {anySample && (
          <div className="banner" role="note">
            <strong>Sample data.</strong> The officials, bills and votes shown here are fictional
            placeholders used to demo the site. They are not real voting records.
          </div>
        )}

        <details className="card disclosure" open={Object.values(districts).some(Boolean)}>
          <summary>
            <span className="h">Your districts</span>
            <span className="muted small">
              {Object.values(districts).some(Boolean) ? 'Filtered to your districts' : 'Optional · showing everyone'}
            </span>
          </summary>
          <DistrictPicker
            stateData={state}
            federal={federal}
            value={districts}
            onChange={(d) => setAllDistricts({ ...allDistricts, [stateId]: d })}
          />
        </details>

        {mode === 'issues' ? (
          <TopicPicker prefs={prefs} onChange={setPrefs} />
        ) : (
          <PartyPicker party={party} onChange={setParty} />
        )}

        <Results
          mode={mode}
          prefs={prefs}
          party={party}
          stateData={state}
          federal={federal}
          districts={districts}
        />

        <About stateData={state} federal={federal} />
      </main>
    </>
  )
}
