#!/usr/bin/env node
/**
 * Imports REAL state legislature data from the Open States API v3
 * (https://docs.openstates.org/api-v3/). Get a free key at
 * https://open.pluralpolicy.com/accounts/profile/ and set OPENSTATES_API_KEY.
 *
 *   OPENSTATES_API_KEY=... node scripts/import-openstates.mjs tn
 *   OPENSTATES_API_KEY=... node scripts/import-openstates.mjs va --session 2025
 *   ... --all-votes      include committee/amendment/procedural votes
 *   ... --max-pages 20   cap bill pages (20 bills per page) to stay under rate limits
 *
 * Works for any state: running it for a new code (e.g. "nc") creates that
 * state's folder and the site picks it up on the next build.
 *
 * Topic tags come from scripts/topic-maps/<state>.json (curated by hand).
 */
import { fetchWithRetry, loadTopicMap, majorities, topicsFor, writeJurisdiction } from './lib.mjs'

const args = process.argv.slice(2)
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt)
const state = args.find((a) => /^[a-z]{2}$/i.test(a))?.toLowerCase()
const KEY = process.env.OPENSTATES_API_KEY
if (!state || !KEY) {
  console.error('Usage: OPENSTATES_API_KEY=... node scripts/import-openstates.mjs <state> [--session ID] [--all-votes] [--max-pages N]')
  process.exit(1)
}
const ALL_VOTES = args.includes('--all-votes')
const MAX_PAGES = Number(opt('--max-pages', 50))
const API = 'https://v3.openstates.org'
const FINAL = /third reading|final passage|passage|pass(ed)? the bill|adopt(ion)? of (the )?conference|veto/i
const PARTY = { Democratic: 'D', Republican: 'R', Independent: 'I', Libertarian: 'L' }
const VOTE = { yes: 'Y', no: 'N' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(path, params) {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries(params)) {
    for (const val of [v].flat()) url.searchParams.append(k, String(val))
  }
  const res = await fetchWithRetry(url, { headers: { 'X-API-KEY': KEY } })
  await sleep(1100) // free tier is rate limited
  return res.json()
}
async function* pages(path, params) {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await get(path, { ...params, page })
    yield* data.results
    if (page >= data.pagination.max_page) return
  }
}

// --- jurisdiction + session ---
const juris = await get(`/jurisdictions/ocd-jurisdiction/country:us/state:${state}/government`, { include: ['organizations', 'legislative_sessions'] })
const sessions = [...juris.legislative_sessions].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
const session = opt('--session', sessions[0]?.identifier)
console.log(`${juris.name}: session ${session}`)

const orgName = (cls) => juris.organizations.find((o) => o.classification === cls)?.name
const chambers = ['upper', 'lower']
  .filter((c) => orgName(c))
  .map((c, i) => ({ id: c, name: `${juris.name} ${orgName(c)}`.replace(`${juris.name} ${juris.name}`, juris.name), districtLabel: c === 'upper' ? 'Senate District' : 'House District', order: i + 1 }))

// --- people ---
const officials = []
const idByOcd = new Map()
const partyByOcd = new Map()
for await (const p of pages('/people', { jurisdiction: state, per_page: 50, include: ['links'] })) {
  const role = p.current_role
  if (!role || !['upper', 'lower'].includes(role.org_classification)) continue
  const id = `${state}-${role.org_classification}-${p.id.split('/').pop()}`
  const party = PARTY[p.party] ?? p.party?.[0] ?? 'I'
  idByOcd.set(p.id, id)
  partyByOcd.set(p.id, party)
  officials.push({
    id,
    name: p.name,
    party,
    chamber: role.org_classification,
    state: state.toUpperCase(),
    district: role.district,
    ...(p.image ? { photoUrl: p.image } : {}),
    ...(p.links?.[0]?.url ? { website: p.links[0].url } : {}),
    externalIds: { openstates: p.id },
  })
}
console.log(`  ${officials.length} legislators`)

// --- bills with roll-call votes ---
const topicMap = loadTopicMap(state)
const bills = []
const votes = {}
for await (const b of pages('/bills', { jurisdiction: state, session, per_page: 20, include: ['votes'], sort: 'latest_action_desc' })) {
  for (const ve of b.votes ?? []) {
    const chamber = ve.organization?.classification
    if (!chambers.some((c) => c.id === chamber)) continue
    if (!ALL_VOTES && !FINAL.test(ve.motion_text ?? '')) continue
    const id = `${state}-${ve.id.split('/').pop()}`
    const row = {}
    const entries = []
    for (const v of ve.votes ?? []) {
      const cast = VOTE[v.option] ?? 'A'
      const ocd = v.voter?.id
      if (ocd && idByOcd.has(ocd)) row[idByOcd.get(ocd)] = cast
      if (ocd && partyByOcd.has(ocd)) entries.push({ party: partyByOcd.get(ocd), vote: cast })
    }
    if (!Object.keys(row).length) continue
    bills.push({
      id,
      chambers: [chamber],
      number: b.identifier,
      title: b.title,
      summary: [ve.motion_text, ve.result].filter(Boolean).join(' · '),
      date: (ve.start_date ?? '').slice(0, 10),
      url: b.openstates_url,
      topics: topicsFor(topicMap, b.identifier, ve.motion_text ?? ''),
      partyMajority: { [chamber]: majorities(entries) },
    })
    votes[id] = row
  }
}
bills.sort((a, b) => b.date.localeCompare(a.date))

writeJurisdiction(state, {
  meta: {
    id: state,
    name: juris.name,
    level: 'state',
    chambers,
    sample: false,
    updated: new Date().toISOString().slice(0, 10),
    sources: [
      { name: 'Open States', url: `https://open.pluralpolicy.com/${state}/`, note: `${juris.name} ${session} session legislators and roll calls.` },
      { name: 'Vote Smart', url: 'https://justfacts.votesmart.org/', note: 'Issue positions and interest-group ratings.' },
    ],
  },
  officials,
  bills,
  votes,
})
const tagged = bills.filter((b) => b.topics.length).length
console.log(`${tagged} of ${bills.length} votes are tagged with a topic. Add more in scripts/topic-maps/${state}.json.`)
