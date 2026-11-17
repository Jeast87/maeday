# VoteAlign

A mobile-friendly site that helps voters see which federal and state officials vote the way they would.

- **By issue:** agree or disagree with statements on hot topics (gun control, abortion, immigration, healthcare and more), mark the ones that matter most, and get a match % for each official based on their recorded votes.
- **By party:** pick a party and see each official's party alignment %, the share of their yes/no votes that matched that party's majority in the same chamber.
- **State + federal:** pick a state to see its U.S. senators and representatives plus its state legislature. Optionally narrow to your own districts.

Tennessee and Virginia are included to start. Adding another state is a data change only (see below).

## ⚠️ Real vs. sample data

| Data | Status |
| --- | --- |
| Topics and topic statements (`src/data/topics.json`) | Real content, editable |
| Federal officials, bills, votes (`src/data/jurisdictions/us`) | **Sample.** Fictional people, simulated votes |
| Tennessee legislature (`src/data/jurisdictions/tn`) | **Sample.** Fictional people, simulated votes. Seat counts match the real chambers, party split approximate |
| Virginia legislature (`src/data/jurisdictions/va`) | **Sample.** Same as above |
| Topic tags for real federal bills (`scripts/topic-maps/us.json`) | Real, 4 starter bills from the 119th Congress |

Sample data is flagged with `"sample": true`. The site shows a banner and a **Sample** badge on every placeholder official. Once real data is imported, both disappear automatically.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # writes the built site to ../vote (served at /vote/)
```

This app lives inside the MAEday Foundation site, which has no build step. The built files in `/vote` are committed, so **run `npm run build` and commit `/vote` after any change** to the app or its data.

## Loading real data

| Source | What it gives | Script |
| --- | --- | --- |
| [Voteview](https://voteview.com/data) | Every congressional roll call and member. Free, no key | `npm run data:federal` |
| [Open States](https://open.pluralpolicy.com/data/) | State legislators, bills, roll calls for all 50 states. Free API key | `OPENSTATES_API_KEY=… npm run data:state -- tn` |
| [Congress.gov API](https://api.congress.gov/) | Bill text, summaries, subjects. Free key | Good next step for auto-tagging topics |
| [Vote Smart](https://justfacts.votesmart.org/) | Issue positions, interest-group ratings (e.g. NRA, Planned Parenthood scorecards) | Licensed API, ask them for access |
| [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) | Member IDs, photos, social links | Photos already linked by the Voteview importer |

ProPublica's Congress API used to be the go-to source but no longer issues new keys, so Voteview and Congress.gov replace it here.

```bash
npm run data:federal                       # 119th Congress, passage votes only
npm run data:federal -- --congress 118     # an earlier Congress
OPENSTATES_API_KEY=xxx npm run data:state -- tn
OPENSTATES_API_KEY=xxx npm run data:state -- va --session 2026
```

Both importers compute each party's majority from the **whole chamber** and store it on each bill, so party alignment is correct even though only covered states' officials are kept.

> Both importers were written against the documented formats but not yet run against the live services. Expect a small fix or two on the first real run.

### Tagging votes with topics

Party alignment works on every vote automatically. Issue matching needs to know which votes are about which topic, and which way a YES vote points. That's a judgment call, so it's curated by hand in `scripts/topic-maps/<id>.json`:

```json
[
  {
    "bill": "H.R. 29",
    "note": "Laken Riley Act: detention of undocumented immigrants charged with theft",
    "topics": [{ "topicId": "immigration", "yesSupports": true }]
  }
]
```

`yesSupports: true` means a YES vote supports the topic's statement in `topics.json` (here, "Immigration enforcement and border security should be stricter"). A bill can count toward several topics. Re-run the importer after editing a map.

## Adding a state

1. Run `OPENSTATES_API_KEY=… npm run data:state -- nc`. This creates `src/data/jurisdictions/nc/`.
2. Optionally add `scripts/topic-maps/nc.json` and re-run.
3. Re-run `npm run data:federal` so North Carolina's U.S. senators and representatives are included.

The site finds every folder in `src/data/jurisdictions/` at build time, so no code changes are needed.

## Data model

See `src/data/types.ts`. Each jurisdiction folder holds:

- `meta.json`: name, level (federal/state), chambers, sources, `sample` flag
- `officials.json`: id, name, party, chamber, state, district
- `bills.json`: one entry per roll-call vote, with topic tags and optional precomputed party majorities
- `votes.json`: `{ billId: { officialId: "Y" | "N" | "A" } }`

## How scores work

`src/lib/scoring.ts`

- **Issue match** = weighted votes that agreed with you ÷ weighted votes on your topics. "Matters a lot" counts double. Absences are skipped.
- **Party alignment** = votes matching the chosen party's chamber majority ÷ all yes/no votes. Tied party votes are skipped.

Scores only reflect votes in the dataset. Officials with no votes on your topics show "No votes" rather than 0%.

## Ideas for later

- Find your districts from an address (Google Civic Information API was retired in 2025; Open States has a `/people.geo` lookup by lat/long)
- Candidates on the ballot (not just incumbents), using Ballotpedia or Vote Smart
- Governors and other statewide offices, using bill signings and vetoes
- Auto-suggest topic tags from Congress.gov bill subjects
