/**
 * Data model for VoteAlign.
 *
 * Every jurisdiction (the federal government, or one state) lives in its own
 * folder under src/data/jurisdictions/<id>/ with four JSON files:
 *
 *   meta.json       Jurisdiction            name, chambers, data sources
 *   officials.json  Official[]              who holds each seat
 *   bills.json      Bill[]                  roll-call votes, tagged with topics
 *   votes.json      VoteMatrix              billId -> officialId -> vote
 *
 * The app discovers folders automatically, so adding a state is just adding
 * a folder (see README "Adding a state").
 */

export type PartyCode = string // "D", "R", "I", "L", ...

export type VoteCast = 'Y' | 'N' | 'A' // yes, no, absent/not voting/present

export interface Chamber {
  /** Stable id used by officials and bills, e.g. "senate", "house", "upper", "lower". */
  id: string
  /** Display name, e.g. "U.S. Senate" or "Tennessee House of Representatives". */
  name: string
  /** Label for a seat's district, e.g. "Congressional District". */
  districtLabel: string
  /** Display order (lower first). */
  order: number
}

export interface DataSource {
  name: string
  url: string
  note?: string
}

export interface Jurisdiction {
  /** "us" for federal, otherwise the two-letter state code in lowercase. */
  id: string
  name: string
  level: 'federal' | 'state'
  chambers: Chamber[]
  /** true when officials/bills/votes are placeholders rather than real records. */
  sample: boolean
  /** ISO date the data was last refreshed. */
  updated: string
  sources: DataSource[]
}

export interface Official {
  id: string
  name: string
  party: PartyCode
  chamber: string
  /**
   * Two-letter state the official represents. For state jurisdictions this is
   * the state itself; for federal officials it is used to filter by state.
   */
  state: string
  /** District number/name. Omit for statewide seats (e.g. U.S. Senate). */
  district?: string
  photoUrl?: string
  website?: string
  /** true when this person is a fictional placeholder. */
  sample?: boolean
  /** IDs in outside systems, used by importers to merge updates. */
  externalIds?: Record<string, string>
}

export interface BillTopic {
  topicId: string
  /**
   * true if voting YES on this bill supports the topic's statement
   * (see topics.json). false if a YES vote opposes it.
   */
  yesSupports: boolean
}

export interface Bill {
  id: string
  /** Chambers that held a recorded vote on this bill. */
  chambers: string[]
  number: string
  title: string
  summary?: string
  date: string
  url?: string
  /** Topics this vote tells us something about. May be empty (still counts for party alignment). */
  topics: BillTopic[]
  /**
   * Optional precomputed party majority per chamber, e.g. { house: { D: "N", R: "Y" } }.
   * Importers fill this from the FULL chamber, because officials.json may only
   * hold members from the states the site covers. When absent, the app computes
   * the majority from the officials it has.
   */
  partyMajority?: Record<string, Record<PartyCode, 'Y' | 'N'>>
}

/** billId -> officialId -> vote */
export type VoteMatrix = Record<string, Record<string, VoteCast>>

export interface Topic {
  id: string
  name: string
  /** A statement the user agrees or disagrees with. */
  statement: string
  icon: string
}

export interface Party {
  code: PartyCode
  name: string
  color: string
}

/** Everything loaded for one jurisdiction. */
export interface JurisdictionData {
  meta: Jurisdiction
  officials: Official[]
  bills: Bill[]
  votes: VoteMatrix
}
