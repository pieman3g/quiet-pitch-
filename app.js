/*
 * APP: pages and logic.  Needs teams.js, sample-data.js (optional) and ratings.js loaded first.
 *
 * Sections:  1. data loading   2. helpers   3. SPOILER CONTROLS   4. components   5. pages   6. router
 */
(() => {
'use strict';

const TZ = 'Europe/London';
const Ratings = window.QPRatings;
let DEMO = true;
let MATCHES = (window.QP_SAMPLE || []).slice();
let LEAGUES = [{code:'PL', name:'Premier League', season:'2026-27'}];
let FEED_TEAMS = null;      // {teamId: {n:'Arsenal', t:'ARS'}} when real data is loaded
let UPDATED = null;         // ISO time the real data was last fetched
let TEAMS = {};             // {key: {n, t, c}}  name, 3-letter code, colour

/* ================================================================== *
 *  1. DATA LOADING
 *  Tries matches.json first. If it isn't there (or the page is opened
 *  straight from disk) the sample data from sample-data.js stays in use.
 *
 *  matches.json can be either:
 *    - a plain array of matches (older/simple format), or
 *    - { updated, leagues:[{code,name,season,table}], teams:{id:{n,t}}, matches:[...] }
 *      which is what the data job writes. Each match has  c  (league code),
 *      h / a (team ids), ko (kick-off, ISO), st (status from the feed),
 *      and score:[h,a] ONLY for finished games.
 * ================================================================== */
async function loadMatches(){
  try{
    const r = await fetch('matches.json',{cache:'no-store'});
    if(!r.ok) return;
    const d = await r.json();
    const list = Array.isArray(d) ? d : (d && d.matches);
    if(!Array.isArray(list) || !list.length) return;
    if(!Array.isArray(d)){
      if(Array.isArray(d.leagues) && d.leagues.length) LEAGUES = d.leagues;
      FEED_TEAMS = d.teams || null;
      UPDATED = d.updated || null;
    }
    MATCHES = list;
    DEMO = false;
  }catch(e){ /* no matches.json: keep sample data */ }
}

function hashColour(s){
  let h = 0;
  for(const ch of String(s)) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 45% 38%)`;
}

/* Names come from the feed; teams.js only supplies optional colour overrides keyed by 3-letter code. */
function buildTeams(){
  const base = window.QP_TEAMS || {};
  TEAMS = {};
  if(FEED_TEAMS){
    Object.keys(FEED_TEAMS).forEach(id => {
      const f = FEED_TEAMS[id], o = base[f.t];
      TEAMS[id] = {n:f.n, t:f.t, c:(o && o.c) || hashColour(f.n)};
    });
  }else{
    Object.keys(base).forEach(k => { TEAMS[k] = {n:base[k].n || k, t:k, c:base[k].c || hashColour(k)}; });
  }
}

/* ================================================================== *
 *  2. HELPERS
 * ================================================================== */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

const fDay  = new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:TZ});
const fLong = new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:TZ});
const fTime = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:TZ});
const fKey  = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:TZ});
const dayKey  = ko  => fKey.format(new Date(ko));
const keyDate = key => new Date(key + 'T12:00:00Z');

const LIVE_WINDOW = 115*60000;
/* upcoming | live | final | pending (kicked off, no result yet) | off (postponed, cancelled, suspended) */
function status(m){
  const t = Date.parse(m.ko), now = Date.now();
  if(m.st){
    if(m.st === 'FINISHED' || m.st === 'AWARDED') return 'final';
    if(m.st === 'IN_PLAY' || m.st === 'PAUSED') return 'live';
    if(m.st === 'POSTPONED' || m.st === 'SUSPENDED' || m.st === 'CANCELLED') return 'off';
    if(now < t) return 'upcoming';
    return now < t + LIVE_WINDOW ? 'live' : 'pending';
  }
  if(now < t) return 'upcoming';
  if(now < t + LIVE_WINDOW) return 'live';
  return 'final';
}
const OFF_LABEL = {POSTPONED:'Postponed', SUSPENDED:'Suspended', CANCELLED:'Cancelled'};

const S = {
  league:null,
  saved:new Set(store.get('qp_saved',[])),
  settings:Object.assign({warn:true,ratings:true}, store.get('qp_settings',{}))
};

const leagueOf = m => m.c || LEAGUES[0].code;
const currentLeague = () => LEAGUES.find(l => l.code === S.league) || LEAGUES[0];
const leagueMatches = () => MATCHES.filter(m => leagueOf(m) === S.league);

function prepare(){
  buildTeams();
  MATCHES = MATCHES.filter(m => TEAMS[m.h] && TEAMS[m.a]);
  const saved = store.get('qp_league', null);
  S.league = LEAGUES.some(l => l.code === saved) ? saved : LEAGUES[0].code;
}

/* ================================================================== *
 *  3. SPOILER CONTROLS
 *  Everything that decides whether a score or the table is visible lives
 *  in this section. Spoiler state is deliberately NOT saved between visits.
 *    Spoil.global      all scores + table visible
 *    Spoil.tableOpen   league table revealed on its own
 *    Spoil.revealed    individual games revealed one by one
 *    Spoil.showsScore(m)  -> true if this game's score may be displayed
 *    Spoil.showsTable()   -> true if the table may be displayed
 *  Live games never show a score.
 * ================================================================== */
const Spoil = {
  global:false,
  tableOpen:false,
  revealed:new Set(),
  showsScore(m){ return status(m) === 'final' && (this.global || this.revealed.has(m.id)); },
  showsTable(){ return this.global || this.tableOpen; },
  toggleGame(id){ this.revealed.has(id) ? this.revealed.delete(id) : this.revealed.add(id); },
  confirm(){
    if(!S.settings.warn) return Promise.resolve(true);
    const d = $('#warn');
    $('#nowarn').checked = false;
    d.returnValue = '';
    return new Promise(res => {
      d.addEventListener('close', () => {
        const ok = d.returnValue === 'ok';
        if(ok && $('#nowarn').checked){ S.settings.warn = false; store.set('qp_settings', S.settings); }
        res(ok);
      }, {once:true});
      d.showModal();
    });
  }
};

/* ================================================================== *
 *  4. COMPONENTS
 * ================================================================== */
const crest = k => `<span class="crest" style="background:${TEAMS[k].c}" aria-hidden="true">${esc(TEAMS[k].t)}</span>`;

function ratingBlock(m){
  const r = S.settings.ratings ? Ratings.get(m) : null;
  if(!r) return '<span></span>';
  const cls = r.score >= 8 ? 'hi' : r.score >= 5 ? 'mid2' : 'lo';
  return `<div class="rate">
    <span class="badge ${cls}" title="Watchability rating">${r.score}/10</span>
    <span class="votes">
      <button class="btn" data-act="up" data-id="${esc(m.id)}" aria-pressed="${r.mine===1}" aria-label="Vote up">▲ ${r.up}</button>
      <button class="btn" data-act="down" data-id="${esc(m.id)}" aria-pressed="${r.mine===-1}" aria-label="Vote down">▼ ${r.down}</button>
    </span></div>`;
}

function chipFor(m, st){
  return st === 'final'   ? '<span class="chip">Full time</span>'
       : st === 'live'    ? '<span class="chip live">In progress</span>'
       : st === 'pending' ? '<span class="chip up">Awaiting result</span>'
       : st === 'off'     ? `<span class="chip up">${OFF_LABEL[m.st] || 'Not played'}</span>`
       : '<span class="chip up">Upcoming</span>';
}

function card(m){
  const st = status(m), ko = new Date(m.ko);
  const shown = Spoil.showsScore(m);
  const mid = shown
    ? (m.score ? `<span class="score">${m.score[0]} – ${m.score[1]}</span>` : '<span class="vs">n/a</span>')
    : '<span class="vs">vs</span>';
  const saved = S.saved.has(m.id);
  const revealBtn = (st === 'final' && !Spoil.global)
    ? `<button class="btn" data-act="reveal" data-id="${esc(m.id)}">${Spoil.revealed.has(m.id) ? 'Hide score' : 'Show score'}</button>` : '';
  return `<article class="card" aria-label="${esc(TEAMS[m.h].n)} versus ${esc(TEAMS[m.a].n)}">
    <div class="meta">${chipFor(m, st)}<span>${fDay.format(ko)} · ${fTime.format(ko)}</span>${m.venue ? `<span>· ${esc(m.venue)}</span>` : ''}</div>
    <div class="teams">
      <div class="team">${crest(m.h)}<b>${esc(TEAMS[m.h].n)}</b></div>
      <div class="mid">${mid}</div>
      <div class="team r"><b>${esc(TEAMS[m.a].n)}</b>${crest(m.a)}</div>
    </div>
    <div class="row">
      ${st === 'final' ? ratingBlock(m) : '<span></span>'}
      <div class="actions">
        ${revealBtn}
        <button class="btn" data-act="save" data-id="${esc(m.id)}" aria-pressed="${saved}">${saved ? '★ Saved' : '☆ Save'}</button>
      </div>
    </div>
    ${st === 'live' ? '<p class="hint">Live scores are never shown here.</p>' : ''}
  </article>`;
}

function demoNotice(){
  return DEMO ? `<p class="notice"><b>Demo mode:</b> these fixtures, results and ratings are made-up sample data so you can try the site.
    Add a <code>matches.json</code> next to this file to show real ones.</p>` : '';
}

function leagueTitle(){
  const L = currentLeague();
  return esc(L.name) + (L.season ? ' · ' + esc(L.season) : '');
}

/* ================================================================== *
 *  5. PAGES
 * ================================================================== */
function viewGames(key){
  const all = leagueMatches();
  const days = [...new Set(all.map(m => dayKey(m.ko)))].sort();
  if(!days.length) return `${demoNotice()}<h1>${leagueTitle()}</h1><p class="empty">No matches yet.</p>`;
  if(!days.includes(key)){
    const started = days.filter(d => all.some(m => dayKey(m.ko) === d && Date.parse(m.ko) <= Date.now()));
    key = started.length ? started[started.length-1] : days[0];
  }
  const i = days.indexOf(key);
  const list = all.filter(m => dayKey(m.ko) === key).sort((a,b) => Date.parse(a.ko) - Date.parse(b.ko));
  const nav = (idx, label) => days[idx]
    ? `<a class="btn" href="#/games/${days[idx]}" aria-label="${label}">${label === 'Previous day' ? '‹' : '›'}</a>`
    : `<span class="btn" aria-disabled="true" aria-label="${label}">${label === 'Previous day' ? '‹' : '›'}</span>`;
  return `${demoNotice()}
    <h1>${leagueTitle()}</h1>
    <p class="sub">${list.length} match${list.length===1?'':'es'} on ${fLong.format(keyDate(key))}</p>
    <div class="pager">
      ${nav(i-1,'Previous day')}
      <label class="sr" for="daySel">Choose a day</label>
      <select id="daySel">${days.map(d => `<option value="${d}"${d===key?' selected':''}>${fDay.format(keyDate(d))}</option>`).join('')}</select>
      ${nav(i+1,'Next day')}
    </div>
    ${list.map(card).join('')}`;
}

function buildTable(){
  const t = {};
  const ms = leagueMatches();
  ms.forEach(m => {
    [m.h, m.a].forEach(k => { if(!t[k]) t[k] = {k,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}; });
  });
  ms.forEach(m => {
    if(status(m) !== 'final' || !m.score) return;
    const [hg,ag] = m.score, H = t[m.h], A = t[m.a];
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if(hg > ag){ H.w++; A.l++; H.pts += 3; }
    else if(hg < ag){ A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  });
  return Object.values(t).sort((x,y) =>
    y.pts-x.pts || (y.gf-y.ga)-(x.gf-x.ga) || y.gf-x.gf || TEAMS[x.k].n.localeCompare(TEAMS[y.k].n));
}

function viewStandings(){
  const head = `${demoNotice()}<h1>Table</h1>`;
  if(currentLeague().table === false){
    return `${head}<p class="empty">A league table isn't available for ${esc(currentLeague().name)}.</p>`;
  }
  if(!Spoil.showsTable()){
    return `${head}<p class="sub">Positions and points would give away results.</p>
      <div class="locked"><h2>Table hidden</h2>
      <p>Reveal it when you've caught up on the games you care about.</p>
      <button class="btn primary" data-act="standings">Reveal table</button></div>`;
  }
  const rows = buildTable().map((r,i) => `<tr>
    <td>${i+1}</td>
    <td><span class="tn">${crest(r.k)}${esc(TEAMS[r.k].n)}</span></td>
    <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
    <td>${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td><td class="pts">${r.pts}</td></tr>`).join('');
  return `${head}<p class="sub">${esc(currentLeague().name)}, calculated from finished matches.</p>
    <table><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function viewTop(){
  const head = `${demoNotice()}<h1>Top games</h1><p class="sub">${esc(currentLeague().name)}: finished matches, best rated first. Scores stay hidden unless you reveal them.</p>`;
  if(!S.settings.ratings) return `${head}<p class="empty">Ratings are switched off in Settings.</p>`;
  const list = leagueMatches().filter(m => status(m) === 'final' && m.rating != null)
    .sort((a,b) => b.rating-a.rating || ((b.up||0)-(b.down||0))-((a.up||0)-(a.down||0)));
  return head + (list.length ? list.map(card).join('') : '<p class="empty">No rated games yet.</p>');
}

function viewSaved(){
  const list = MATCHES.filter(m => S.saved.has(m.id)).sort((a,b) => Date.parse(b.ko)-Date.parse(a.ko));
  return `<h1>Saved games</h1><p class="sub">Games you've bookmarked on this device.</p>` +
    (list.length ? list.map(card).join('') : '<p class="empty">Nothing saved yet. Tap ☆ Save on any game.</p>');
}

function viewSettings(){
  return `<h1>Settings</h1>
    <div class="set"><input type="checkbox" id="s-warn" data-set="warn" ${S.settings.warn?'checked':''}>
      <label for="s-warn">Warn me before revealing spoilers<small>Shows a confirmation before the table or the global spoiler switch.</small></label></div>
    <div class="set"><input type="checkbox" id="s-rat" data-set="ratings" ${S.settings.ratings?'checked':''}>
      <label for="s-rat">Show watch ratings<small>A 1–10 score for how worth-watching a finished game was. Turn off if even that feels like too much.</small></label></div>
    <p style="margin-top:18px"><button class="btn" data-act="reset">Clear saved games, votes and settings</button></p>`;
}

/* ================================================================== *
 *  6. ROUTER + EVENTS
 * ================================================================== */
function render(){
  const parts = location.hash.replace(/^#\/?/,'').split('/');
  const r = ['games','standings','top','saved','settings'].includes(parts[0]) ? parts[0] : 'games';
  $('#app').innerHTML =
    r === 'games' ? viewGames(parts[1]) :
    r === 'standings' ? viewStandings() :
    r === 'top' ? viewTop() :
    r === 'saved' ? viewSaved() : viewSettings();
  document.querySelectorAll('#nav a').forEach(a => {
    if(a.dataset.r === r) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  const b = $('#spoilerBtn');
  b.setAttribute('aria-pressed', String(Spoil.global));
  b.textContent = Spoil.global ? 'Spoilers: shown' : 'Spoilers: hidden';

  const sel = $('#leagueSel');
  if(LEAGUES.length > 1){
    sel.hidden = false;
    sel.innerHTML = LEAGUES.map(l => `<option value="${esc(l.code)}"${l.code===S.league?' selected':''}>${esc(l.name)}</option>`).join('');
  }else{
    sel.hidden = true;
  }

  $('#credit').hidden = DEMO;
  const up = UPDATED ? new Date(UPDATED) : null;
  $('#updated').textContent = up && !isNaN(up) ? ` · updated ${fDay.format(up)} ${fTime.format(up)}` : '';
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if(!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  if(act === 'reveal'){ Spoil.toggleGame(id); }
  else if(act === 'save'){
    S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id);
    store.set('qp_saved', [...S.saved]);
  }
  else if(act === 'up' || act === 'down'){ Ratings.vote(id, act === 'up' ? 1 : -1); }
  else if(act === 'spoilers'){
    if(Spoil.global) Spoil.global = false;
    else if(await Spoil.confirm()) Spoil.global = true;
  }
  else if(act === 'standings'){ if(await Spoil.confirm()) Spoil.tableOpen = true; }
  else if(act === 'reset'){
    S.saved.clear(); S.settings = {warn:true,ratings:true};
    store.set('qp_saved',[]); store.set('qp_settings',S.settings);
    Ratings.clear();
  }
  render();
});

document.addEventListener('change', e => {
  if(e.target.id === 'daySel'){ location.hash = '#/games/' + e.target.value; return; }
  if(e.target.id === 'leagueSel'){
    S.league = e.target.value; store.set('qp_league', S.league);
    if(location.hash.indexOf('#/games/') === 0) location.hash = '#/games'; else render();
    return;
  }
  const k = e.target.dataset && e.target.dataset.set;
  if(k){ S.settings[k] = e.target.checked; store.set('qp_settings', S.settings); render(); }
});

window.addEventListener('hashchange', () => { window.scrollTo(0,0); render(); });

prepare();
render();
loadMatches().then(() => { prepare(); render(); });
})();
