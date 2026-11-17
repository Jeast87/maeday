#!/usr/bin/env node
/**
 * Generates PLACEHOLDER data for the federal government, Tennessee and
 * Virginia so the app works before real data is imported.
 *
 * Every official is fictional and every vote is simulated from a simple
 * party-ideology model. Nothing here describes a real person's record.
 * Seat counts and party splits are approximate.
 *
 *   node scripts/generate-sample.mjs            # writes all three
 *   node scripts/generate-sample.mjs tn         # only Tennessee
 *
 * Re-running is deterministic (seeded RNG), so diffs stay clean.
 * Real importers (scripts/import-*.mjs) overwrite these files with real data.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'jurisdictions')
const TODAY = new Date().toISOString().slice(0, 10)

// ---------- deterministic randomness ----------
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r) => {
  const u = 1 - r()
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ---------- fictional names ----------
const FIRST = ['Avery', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Harper', 'Rowan', 'Emerson', 'Sawyer', 'Hayden', 'Parker', 'Reese', 'Dakota', 'Finley', 'Skyler', 'Marlow', 'Ellis', 'Blair', 'Sutton', 'Lennox', 'Arden', 'Kendall', 'Shiloh', 'Briar', 'Tatum', 'Hollis', 'Lane', 'Remy', 'Sage']
const LAST = ['Ashgrove', 'Bellweather', 'Calloway', 'Dunmore', 'Everly', 'Fairbank', 'Glenwood', 'Hartwell', 'Ironside', 'Juniper', 'Kingsley', 'Larkspur', 'Merriweather', 'Northam-Vale', 'Oakhurst', 'Pembrook', 'Quill', 'Ravenscroft', 'Stillwater', 'Thornbury', 'Underhill', 'Vantreese', 'Whitlock', 'Yarborough', 'Zephyr', 'Birchfield', 'Copperfield', 'Driftwood', 'Elmstead', 'Foxhollow', 'Greystone', 'Hollowell', 'Linden', 'Marchbanks', 'Pinecrest', 'Rosemont', 'Silverton', 'Tanglewood', 'Westbrook', 'Wildacre']

// ---------- how each topic splits along party lines in the simulation ----------
// lean > 0: Republicans tend to SUPPORT the topic statement; < 0: Democrats do.
const LEAN = { guns: -1, abortion: -1, immigration: 1, healthcare: -0.9, climate: -0.9, taxes: 1, 'school-choice': 0.8, 'min-wage': -0.9, policing: 0.7, voting: 1, marijuana: -0.4, lgbtq: -1 }

// Two bill templates per topic: one where YES supports the statement, one where YES opposes it.
const TEMPLATES = {
  guns: [['Universal Background Check Act', 'Requires background checks for all firearm sales, including private sales.', true], ['Permitless Carry Expansion Act', 'Removes permit requirements to carry a handgun.', false]],
  abortion: [['Reproductive Access Protection Act', 'Protects access to abortion services up to fetal viability.', true], ['Heartbeat Protection Act', 'Prohibits most abortions after cardiac activity is detected.', false]],
  immigration: [['Border Enforcement Funding Act', 'Increases funding for border enforcement and detention.', true], ['Pathway to Residency Act', 'Creates a path to legal residency for long-term undocumented residents.', false]],
  healthcare: [['Medicaid Expansion Act', 'Expands Medicaid eligibility to adults up to 138% of the poverty line.', true], ['Health Program Spending Cap Act', 'Caps annual growth in public health program spending.', false]],
  climate: [['Clean Energy Standard Act', 'Sets a target for utilities to reach 80% clean electricity.', true], ['Energy Permitting Relief Act', 'Shortens environmental review for fossil fuel projects.', false]],
  taxes: [['Income Tax Relief Act', 'Cuts income tax rates across brackets.', true], ['Revenue Restoration Act', 'Raises the top tax rate to fund public services.', false]],
  'school-choice': [['Education Freedom Scholarship Act', 'Creates vouchers usable at private schools.', true], ['Public School Funding Guarantee Act', 'Bars public education funds from going to private schools.', false]],
  'min-wage': [['Fair Wage Act', 'Raises the minimum wage in steps to $15 per hour.', true], ['Wage Preemption Act', 'Prevents local governments from setting their own minimum wage.', false]],
  policing: [['Safer Streets Act', 'Increases police funding and penalties for violent crime.', true], ['Police Accountability Act', 'Creates civilian oversight boards and limits no-knock warrants.', false]],
  voting: [['Election Integrity Act', 'Requires photo ID to vote and more frequent roll purges.', true], ['Ballot Access Act', 'Expands early voting and automatic voter registration.', false]],
  marijuana: [['Cannabis Regulation Act', 'Legalizes and regulates adult-use marijuana.', true], ['Drug-Free Communities Act', 'Increases penalties for marijuana possession.', false]],
  lgbtq: [['Equality in Employment Act', 'Adds sexual orientation and gender identity to anti-discrimination law.', true], ['Religious Liberty in Services Act', 'Lets businesses refuse services that conflict with religious beliefs.', false]],
}
// Votes that aren't tied to a hot topic still count toward party alignment.
const GENERAL = [
  ['General Appropriations Act', 'Funds government operations for the fiscal year.', 0.6, 0.4],
  ['Infrastructure Investment Act', 'Funds roads, bridges and broadband.', -0.3, 1.2],
  ['Veterans Services Improvement Act', 'Expands mental health services for veterans.', 0, 2.2],
  ['Regulatory Review Act', 'Requires legislative approval for major new regulations.', 0.9, 0],
]

// ---------- jurisdictions ----------
const SOURCES_FED = [
  { name: 'Congress.gov API', url: 'https://api.congress.gov/', note: 'Members, bills and roll-call votes (free API key).' },
  { name: 'Voteview', url: 'https://voteview.com/data', note: 'Every congressional roll call, CSV download, no key.' },
  { name: 'ProPublica Congress API', url: 'https://www.propublica.org/datastore/api/propublica-congress-api', note: 'Historic; no longer accepting new keys.' },
  { name: 'unitedstates/congress-legislators', url: 'https://github.com/unitedstates/congress-legislators', note: 'Current members with IDs and photos.' },
  { name: 'Vote Smart', url: 'https://justfacts.votesmart.org/', note: 'Issue positions and interest-group ratings.' },
]
const sourcesState = (name, legUrl) => [
  { name: 'Open States API', url: 'https://open.pluralpolicy.com/data/', note: `${name} legislators, bills and votes (free API key).` },
  { name: `${name} General Assembly`, url: legUrl, note: 'Official source for bills and vote records.' },
  { name: 'Vote Smart', url: 'https://justfacts.votesmart.org/', note: 'Issue positions and interest-group ratings.' },
]

const JURIS = {
  us: {
    meta: {
      id: 'us', name: 'Federal', level: 'federal',
      chambers: [
        { id: 'senate', name: 'U.S. Senate', districtLabel: 'Statewide', order: 1 },
        { id: 'house', name: 'U.S. House', districtLabel: 'Congressional District', order: 2 },
      ],
      sources: SOURCES_FED,
    },
    // [state, chamber, seats, R count]
    seats: [['TN', 'senate', 2, 2], ['TN', 'house', 9, 8], ['VA', 'senate', 2, 0], ['VA', 'house', 11, 5]],
    billPrefix: { senate: 'S.', house: 'H.R.' },
  },
  tn: {
    meta: {
      id: 'tn', name: 'Tennessee', level: 'state',
      chambers: [
        { id: 'upper', name: 'Tennessee Senate', districtLabel: 'Senate District', order: 1 },
        { id: 'lower', name: 'Tennessee House', districtLabel: 'House District', order: 2 },
      ],
      sources: sourcesState('Tennessee', 'https://wapp.capitol.tn.gov/apps/'),
    },
    seats: [['TN', 'upper', 33, 27], ['TN', 'lower', 99, 75]],
    billPrefix: { upper: 'SB', lower: 'HB' },
  },
  va: {
    meta: {
      id: 'va', name: 'Virginia', level: 'state',
      chambers: [
        { id: 'upper', name: 'Virginia Senate', districtLabel: 'Senate District', order: 1 },
        { id: 'lower', name: 'Virginia House of Delegates', districtLabel: 'House District', order: 2 },
      ],
      sources: sourcesState('Virginia', 'https://lis.virginia.gov/'),
    },
    seats: [['VA', 'upper', 40, 19], ['VA', 'lower', 100, 49]],
    billPrefix: { upper: 'SB', lower: 'HB' },
  },
}

function build(id) {
  const j = JURIS[id]
  const r = rng('voteAlign:' + id)
  const officials = []
  const ideology = {}
  const usedNames = new Set()
  const name = () => {
    for (;;) {
      const n = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`
      if (!usedNames.has(n)) { usedNames.add(n); return n }
    }
  }

  for (const [state, chamber, seats, reps] of j.seats) {
    // spread Republicans across districts rather than bunching them
    const parties = Array.from({ length: seats }, (_, i) => (Math.floor(((i + 1) * reps) / seats) > Math.floor((i * reps) / seats) ? 'R' : 'D'))
    parties.forEach((party, i) => {
      const statewide = chamber === 'senate'
      const d = String(i + 1)
      const oid = statewide
        ? `us-senate-${state.toLowerCase()}-${i + 1}`
        : `${id}-${chamber}-${id === 'us' ? state.toLowerCase() + '-' : ''}${d.padStart(2, '0')}`
      officials.push({
        id: oid, name: name(), party, chamber, state,
        ...(statewide ? {} : { district: d }),
        sample: true,
      })
      ideology[oid] = (party === 'R' ? 1 : -1) * (1 + gauss(r) * 0.3)
    })
  }

  const bills = []
  const votes = {}
  let n = 100
  const chambers = j.meta.chambers.map((c) => c.id)
  const addBill = (title, summary, topics, lean, popularity) => {
    n += 7
    const firstChamber = chambers[n % chambers.length]
    const bid = `${id}-sample-${n}`
    const month = String(1 + (n % 12)).padStart(2, '0')
    bills.push({
      id: bid, chambers, number: `${j.billPrefix[firstChamber]} ${n}`,
      title, summary, date: `2025-${month}-${String(1 + (n % 27)).padStart(2, '0')}`,
      topics,
    })
    votes[bid] = {}
    for (const o of officials) {
      if (r() < 0.04) { votes[bid][o.id] = 'A'; continue }
      const score = ideology[o.id] * lean + popularity + gauss(r) * 0.7
      votes[bid][o.id] = score > 0 ? 'Y' : 'N'
    }
  }

  for (const [topicId, pair] of Object.entries(TEMPLATES)) {
    for (const [title, summary, yesSupports] of pair) {
      const lean = LEAN[topicId] * (yesSupports ? 1 : -1)
      addBill(title, summary, [{ topicId, yesSupports }], lean, (r() - 0.5) * 0.4)
    }
  }
  for (const [title, summary, lean, pop] of GENERAL) addBill(title, summary, [], lean, pop)

  const meta = { ...j.meta, sample: true, updated: TODAY }
  const dir = join(ROOT, id)
  mkdirSync(dir, { recursive: true })
  const write = (f, data) => writeFileSync(join(dir, f), JSON.stringify(data, null, 1) + '\n')
  write('meta.json', meta)
  write('officials.json', officials)
  write('bills.json', bills)
  write('votes.json', votes)
  console.log(`${id}: ${officials.length} officials, ${bills.length} bills (sample)`)
}

const only = process.argv.slice(2)
for (const id of only.length ? only : Object.keys(JURIS)) build(id)
