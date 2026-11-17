// Shared helpers for the data importers.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const JURIS_DIR = join(ROOT, 'src', 'data', 'jurisdictions')

/** Two-letter codes of states that have a data folder, e.g. ["TN", "VA"]. */
export function coveredStates() {
  return readdirSync(JURIS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'us')
    .map((d) => d.name.toUpperCase())
}

export function writeJurisdiction(id, { meta, officials, bills, votes }) {
  const dir = join(JURIS_DIR, id)
  mkdirSync(dir, { recursive: true })
  const write = (f, data) => writeFileSync(join(dir, f), JSON.stringify(data, null, 1) + '\n')
  write('meta.json', meta)
  write('officials.json', officials)
  write('bills.json', bills)
  write('votes.json', votes)
  console.log(`${id}: wrote ${officials.length} officials, ${bills.length} votes`)
}

/**
 * Topic maps live in scripts/topic-maps/<id>.json and are curated by hand:
 *   [{ "bill": "H.R. 1234", "topics": [{ "topicId": "guns", "yesSupports": true }] }]
 * "bill" is matched case/space-insensitively against Bill.number. Optional
 * "motion" narrows the match to votes whose title contains that text.
 */
export function loadTopicMap(id) {
  const f = join(ROOT, 'scripts', 'topic-maps', `${id}.json`)
  if (!existsSync(f)) return []
  return JSON.parse(readFileSync(f, 'utf8'))
}
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
export function topicsFor(map, number, title) {
  const hit = map.filter(
    (m) => norm(m.bill) === norm(number) && (!m.motion || String(title).toLowerCase().includes(m.motion.toLowerCase())),
  )
  return hit.flatMap((m) => m.topics)
}

/** Majority Y/N per party, from a list of { party, vote } in one chamber. */
export function majorities(entries) {
  const tally = {}
  for (const { party, vote } of entries) {
    if (vote !== 'Y' && vote !== 'N') continue
    const t = (tally[party] ??= { Y: 0, N: 0 })
    t[vote]++
  }
  const out = {}
  for (const [party, t] of Object.entries(tally)) if (t.Y !== t.N) out[party] = t.Y > t.N ? 'Y' : 'N'
  return out
}

export async function fetchWithRetry(url, opts = {}, tries = 5) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, opts)
    if (res.ok) return res
    if (i >= tries - 1 || (res.status !== 429 && res.status < 500)) {
      throw new Error(`${res.status} ${res.statusText} for ${url}\n${await res.text().catch(() => '')}`)
    }
    const wait = 2 ** i * 2000
    console.warn(`  ${res.status}, retrying in ${wait / 1000}s`)
    await new Promise((r) => setTimeout(r, wait))
  }
}

/** Minimal CSV parser that handles quoted fields. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1)
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}
