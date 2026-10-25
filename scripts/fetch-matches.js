#!/usr/bin/env node
/*
 * DATA JOB: fetches fixtures and results from football-data.org and writes matches.json.
 *
 *   FOOTBALL_DATA_KEY=your-key node scripts/fetch-matches.js
 *
 * Environment:
 *   FOOTBALL_DATA_KEY   (required) your football-data.org API token. Never put it in a file.
 *   OUT_FILE            where to write the result (default: matches.json)
 *
 * Safe by design:
 *   - If anything fails, or no matches come back, it exits with an error and writes NOTHING,
 *     so the site keeps showing the last good data.
 *   - Scores are only written for FINISHED games. Live scores are never stored.
 *   - Crest/badge image links from the feed are deliberately ignored.
 *
 * To add competitions, add a line to LEAGUES. All the ones below are on football-data.org's free tier,
 * but check each code on their coverage page before switching it on.
 *   Champions League needs  table:false  (it isn't a normal league table).
 */
'use strict';
const fs = require('fs');

const LEAGUES = [
  { code: 'PL', name: 'Premier League' },
  // { code: 'CL',  name: 'Champions League', table: false },
  // { code: 'PD',  name: 'La Liga' },
  // { code: 'BL1', name: 'Bundesliga' },
  // { code: 'SA',  name: 'Serie A' },
  // { code: 'FL1', name: 'Ligue 1' },
];

const API = 'https://api.football-data.org/v4';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* "2026-08-15" -> "2026-27" */
function seasonLabel(api) {
  const start = api && api.matches && api.matches[0] && api.matches[0].season && api.matches[0].season.startDate;
  const y = start ? parseInt(String(start).slice(0, 4), 10) : NaN;
  return Number.isInteger(y) ? `${y}-${String(y + 1).slice(2)}` : null;
}

/* Turns one competition's API response into our simple match list. */
function transform(code, api) {
  const matches = [];
  const teams = {};
  for (const m of (api && api.matches) || []) {
    const h = m.homeTeam, a = m.awayTeam;
    if (!h || !a || h.id == null || a.id == null) continue;   // e.g. knockout games with teams not decided yet
    for (const t of [h, a]) {
      const name = t.shortName || t.name || String(t.id);
      teams[t.id] = { n: name, t: t.tla || name.slice(0, 3).toUpperCase() };
    }
    const match = { id: `${code}-${m.id}`, c: code, h: String(h.id), a: String(a.id), ko: m.utcDate, st: m.status };
    if (m.matchday != null) match.md = m.matchday;
    if (m.stage) match.stage = m.stage;
    if (m.venue) match.venue = m.venue;
    const finished = m.status === 'FINISHED' || m.status === 'AWARDED';
    const ft = m.score && m.score.fullTime;
    if (finished && ft && Number.isInteger(ft.home) && Number.isInteger(ft.away)) match.score = [ft.home, ft.away];
    matches.push(match);
  }
  return { matches, teams, season: seasonLabel(api) };
}

async function get(url, key) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(url, { headers: { 'X-Auth-Token': key } });
    if (res.status === 429 && attempt === 1) {
      console.log('Rate limited by the API, waiting 65 seconds before one retry...');
      await sleep(65000);
      continue;
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`HTTP ${res.status} from ${url}: ${body}`);
    }
    return res.json();
  }
}

async function main() {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) throw new Error('FOOTBALL_DATA_KEY is not set. Add it as a repository secret (see README).');

  const out = { updated: new Date().toISOString(), leagues: [], teams: {}, matches: [] };
  for (let i = 0; i < LEAGUES.length; i++) {
    const L = LEAGUES[i];
    if (i > 0) await sleep(7000);                     // free plan allows 10 calls a minute
    console.log(`Fetching ${L.name} (${L.code})...`);
    const api = await get(`${API}/competitions/${L.code}/matches`, key);
    const r = transform(L.code, api);
    console.log(`  ${r.matches.length} matches, ${Object.keys(r.teams).length} teams`);
    if (!r.matches.length) throw new Error(`No matches returned for ${L.code}. Not overwriting the site data.`);
    const league = { code: L.code, name: L.name };
    if (r.season) league.season = r.season;
    if (L.table === false) league.table = false;
    out.leagues.push(league);
    Object.assign(out.teams, r.teams);
    out.matches.push(...r.matches);
  }

  out.matches.sort((x, y) => Date.parse(x.ko) - Date.parse(y.ko) || x.id.localeCompare(y.id));
  const file = process.env.OUT_FILE || 'matches.json';
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`Wrote ${out.matches.length} matches to ${file}`);
}

module.exports = { transform, seasonLabel };

if (require.main === module) {
  main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
}
