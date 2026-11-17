#!/usr/bin/env node
/**
 * Imports REAL federal data from Voteview (https://voteview.com/data), which
 * publishes every congressional roll call as free CSVs. No API key needed.
 *
 *   node scripts/import-voteview.mjs                 # 119th Congress, passage votes
 *   node scripts/import-voteview.mjs --congress 118
 *   node scripts/import-voteview.mjs --all-votes     # include amendments, procedural votes
 *
 * Only members from states that have a folder in src/data/jurisdictions are
 * kept (to keep the download small), but party majorities are computed from
 * the full chamber and stored on each bill, so alignment scores are correct.
 *
 * Topic tags come from scripts/topic-maps/us.json (curated by hand).
 * Writes src/data/jurisdictions/us/*, replacing the sample data.
 */
import { coveredStates, fetchWithRetry, loadTopicMap, majorities, parseCsv, topicsFor, writeJurisdiction } from './lib.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt)

const CONGRESS = Number(opt('--congress', 119))
const ALL_VOTES = flag('--all-votes')
const STATES = new Set(coveredStates())
const BASE = 'https://voteview.com/static/data/out'
const PARTY = { 100: 'D', 200: 'R', 328: 'I' }
const PASSAGE = /passage|pass the bill|agreeing to the (resolution|conference report)|override|cloture on the motion to proceed|suspend the rules and pass|confirmation/i
const BILL_PATH = { HR: 'house-bill', S: 'senate-bill', HJRES: 'house-joint-resolution', SJRES: 'senate-joint-resolution', HRES: 'house-resolution', SRES: 'senate-resolution', HCONRES: 'house-concurrent-resolution', SCONRES: 'senate-concurrent-resolution' }
const BILL_LABEL = { HR: 'H.R.', S: 'S.', HJRES: 'H.J.Res.', SJRES: 'S.J.Res.', HRES: 'H.Res.', SRES: 'S.Res.', HCONRES: 'H.Con.Res.', SCONRES: 'S.Con.Res.' }

const cast = (code) => {
  const c = Number(code)
  if (c >= 1 && c <= 3) return 'Y'
  if (c >= 4 && c <= 6) return 'N'
  if (c >= 7 && c <= 9) return 'A'
  return null
}
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
const titleName = (bioname) => {
  const [last, rest = ''] = bioname.split(', ')
  const fix = (s) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase())
  return `${rest.replace(/\(([^)]+)\)/, '"$1"')} ${fix(last)}`.replace(/\s+/g, ' ').trim()
}

async function csv(path) {
  console.log(`  fetching ${path}`)
  const res = await fetchWithRetry(`${BASE}/${path}`)
  return parseCsv(await res.text())
}

const topicMap = loadTopicMap('us')
const officials = []
const bills = []
const votes = {}

for (const [ch, chamberId] of [['S', 'senate'], ['H', 'house']]) {
  console.log(`${chamberId}:`)
  const [members, rollcalls, castRows] = await Promise.all([
    csv(`members/${ch}${CONGRESS}_members.csv`),
    csv(`rollcalls/${ch}${CONGRESS}_rollcalls.csv`),
    csv(`votes/${ch}${CONGRESS}_votes.csv`),
  ])

  const memberByIcpsr = new Map(members.filter((m) => m.chamber !== 'President').map((m) => [m.icpsr, m]))
  const lastRoll = Math.max(...rollcalls.map((r) => Number(r.rollnumber)))
  const recentVoters = new Set(
    castRows.filter((v) => Number(v.rollnumber) > lastRoll - 50 && cast(v.cast_code)).map((v) => v.icpsr),
  )

  const keepRolls = new Map()
  for (const r of rollcalls) {
    if (!ALL_VOTES && !PASSAGE.test(r.vote_question ?? '')) continue
    keepRolls.set(r.rollnumber, r)
  }

  // members we show: current (voted recently) and from a covered state
  const shown = new Map()
  for (const m of memberByIcpsr.values()) {
    if (!STATES.has(m.state_abbrev) || !recentVoters.has(m.icpsr)) continue
    const id = `us-${chamberId}-${m.bioguide_id || m.icpsr}`
    shown.set(m.icpsr, id)
    officials.push({
      id,
      name: titleName(m.bioname),
      party: PARTY[m.party_code] ?? 'I',
      chamber: chamberId,
      state: m.state_abbrev,
      ...(chamberId === 'house' ? { district: String(Number(m.district_code) || 'At-large') } : {}),
      ...(m.bioguide_id ? {
        photoUrl: `https://unitedstates.github.io/images/congress/225x275/${m.bioguide_id}.jpg`,
        website: `https://bioguide.congress.gov/search/bio/${m.bioguide_id}`,
      } : {}),
      externalIds: { icpsr: m.icpsr, ...(m.bioguide_id ? { bioguide: m.bioguide_id } : {}) },
    })
  }

  // group casts by rollcall
  const byRoll = new Map()
  for (const v of castRows) {
    if (!keepRolls.has(v.rollnumber)) continue
    const arr = byRoll.get(v.rollnumber) ?? []
    arr.push(v)
    byRoll.set(v.rollnumber, arr)
  }

  for (const [roll, r] of keepRolls) {
    const rows = byRoll.get(roll) ?? []
    const id = `us-${CONGRESS}-${ch.toLowerCase()}-${roll}`
    const m = (r.bill_number ?? '').match(/^([A-Z]+)(\d+)$/)
    const number = m ? `${BILL_LABEL[m[1]] ?? m[1]} ${m[2]}` : `${ch === 'S' ? 'Senate' : 'House'} roll call ${roll}`
    const title = r.vote_desc || r.dtl_desc || r.vote_question || number
    const entries = []
    const row = {}
    for (const v of rows) {
      const c = cast(v.cast_code)
      const mem = memberByIcpsr.get(v.icpsr)
      if (!c || !mem) continue
      entries.push({ party: PARTY[mem.party_code] ?? 'I', vote: c })
      const oid = shown.get(v.icpsr)
      if (oid) row[oid] = c
    }
    bills.push({
      id,
      chambers: [chamberId],
      number,
      title,
      summary: [r.vote_question, r.vote_result].filter(Boolean).join(' · '),
      date: r.date,
      ...(m && BILL_PATH[m[1]] ? { url: `https://www.congress.gov/bill/${ordinal(CONGRESS)}-congress/${BILL_PATH[m[1]]}/${m[2]}` } : {}),
      topics: topicsFor(topicMap, number, title),
      partyMajority: { [chamberId]: majorities(entries) },
    })
    votes[id] = row
  }
}

bills.sort((a, b) => b.date.localeCompare(a.date))

writeJurisdiction('us', {
  meta: {
    id: 'us',
    name: 'Federal',
    level: 'federal',
    chambers: [
      { id: 'senate', name: 'U.S. Senate', districtLabel: 'Statewide', order: 1 },
      { id: 'house', name: 'U.S. House', districtLabel: 'Congressional District', order: 2 },
    ],
    sample: false,
    updated: new Date().toISOString().slice(0, 10),
    sources: [
      { name: 'Voteview', url: 'https://voteview.com/data', note: `${ordinal(CONGRESS)} Congress roll calls and members.` },
      { name: 'Congress.gov', url: 'https://www.congress.gov/', note: 'Bill text and status.' },
      { name: 'Vote Smart', url: 'https://justfacts.votesmart.org/', note: 'Issue positions and interest-group ratings.' },
    ],
  },
  officials,
  bills,
  votes,
})
const tagged = bills.filter((b) => b.topics.length).length
console.log(`${tagged} of ${bills.length} votes are tagged with a topic. Add more in scripts/topic-maps/us.json.`)
