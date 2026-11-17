import type { Bill, JurisdictionData, Official, PartyCode, VoteCast } from '../data/types'

/** The user's view on one topic: +1 agree with the statement, -1 disagree. */
export interface TopicPref {
  stance: 1 | -1
  /** 2 when the user marked it as "matters a lot". */
  weight: 1 | 2
}
export type Prefs = Record<string, TopicPref>

export interface VoteDetail {
  bill: Bill
  vote: VoteCast
  /** For topic matching: did this vote agree with the user? For party: with the party majority? */
  agrees: boolean
  topicId?: string
  /** Party mode only: what the party majority voted. */
  partyVote?: 'Y' | 'N'
}

export interface Score {
  /** 0–100, or null when there were no countable votes. */
  pct: number | null
  agreed: number
  total: number
  details: VoteDetail[]
}

const pct = (a: number, t: number) => (t > 0 ? Math.round((a / t) * 100) : null)

/**
 * Issue match: for each bill tagged with a topic the user has a view on,
 * check whether the official's vote moved policy the way the user wants.
 * "Matters a lot" topics count double. Absences are skipped.
 */
export function topicMatch(official: Official, data: JurisdictionData, prefs: Prefs): Score {
  let agreed = 0
  let total = 0
  const details: VoteDetail[] = []
  for (const bill of data.bills) {
    const vote = data.votes[bill.id]?.[official.id]
    if (!vote || vote === 'A') continue
    for (const t of bill.topics) {
      const pref = prefs[t.topicId]
      if (!pref) continue
      const supportsStatement = (vote === 'Y') === t.yesSupports
      const agrees = supportsStatement === (pref.stance === 1)
      total += pref.weight
      if (agrees) agreed += pref.weight
      details.push({ bill, vote, agrees, topicId: t.topicId })
    }
  }
  return { pct: pct(agreed, total), agreed, total, details }
}

/** Majority vote of a party's members in one chamber on one bill, or null if none/tied. */
function partyMajority(bill: Bill, data: JurisdictionData, party: PartyCode, chamber: string): 'Y' | 'N' | null {
  const pre = bill.partyMajority?.[chamber]
  if (pre) return pre[party] ?? null
  let y = 0
  let n = 0
  const row = data.votes[bill.id] ?? {}
  for (const o of data.officials) {
    if (o.party !== party || o.chamber !== chamber) continue
    const v = row[o.id]
    if (v === 'Y') y++
    else if (v === 'N') n++
  }
  if (y === n) return null
  return y > n ? 'Y' : 'N'
}

export type MajorityCache = Map<string, 'Y' | 'N' | null>

/**
 * Party alignment: the share of an official's recorded yes/no votes that
 * matched the majority of the chosen party in the same chamber. Bills where
 * that party had no members voting, or split evenly, are skipped.
 */
export function partyAlignment(
  official: Official,
  data: JurisdictionData,
  party: PartyCode,
  cache: MajorityCache = new Map(),
): Score {
  let agreed = 0
  let total = 0
  const details: VoteDetail[] = []
  for (const bill of data.bills) {
    if (!bill.chambers.includes(official.chamber)) continue
    const vote = data.votes[bill.id]?.[official.id]
    if (!vote || vote === 'A') continue
    const key = `${data.meta.id}|${bill.id}|${party}|${official.chamber}`
    let maj = cache.get(key)
    if (maj === undefined) {
      maj = partyMajority(bill, data, party, official.chamber)
      cache.set(key, maj)
    }
    if (!maj) continue
    const agrees = vote === maj
    total++
    if (agrees) agreed++
    details.push({ bill, vote, agrees, partyVote: maj })
  }
  return { pct: pct(agreed, total), agreed, total, details }
}
