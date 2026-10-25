/*
 * SAMPLE DATA: made-up fixtures, results and ratings so the site works out of the box.
 * The site uses this ONLY when there is no matches.json next to index.html.
 * Delete this file (and its <script> line in index.html) once real data is flowing.
 *
 * matches.json uses exactly the same shape, as a plain JSON array:
 *   id      unique text id
 *   h, a    home / away team codes (must exist in teams.js)
 *   ko      kick-off as an ISO time WITH offset, e.g. 2026-10-17T12:30:00+01:00
 *   venue   optional
 *   score   optional [homeGoals, awayGoals]  (leave out for unplayed games)
 *   rating  optional 1-10 "worth watching" score
 *   up/down optional vote counts
 */
window.QP_SAMPLE = [
  {id:'m01',h:'ARS',a:'TOT',ko:'2026-10-17T12:30:00+01:00',venue:'Emirates Stadium',score:[2,2],rating:9,up:31,down:1},
  {id:'m02',h:'LIV',a:'NEW',ko:'2026-10-17T15:00:00+01:00',venue:'Anfield',score:[3,1],rating:7,up:18,down:3},
  {id:'m03',h:'MCI',a:'AVL',ko:'2026-10-17T17:30:00+01:00',venue:'Etihad Stadium',score:[4,0],rating:3,up:4,down:9},
  {id:'m04',h:'CHE',a:'MUN',ko:'2026-10-18T13:00:00+01:00',venue:'Stamford Bridge',score:[1,1],rating:6,up:12,down:4},
  {id:'m05',h:'BHA',a:'WHU',ko:'2026-10-18T15:30:00+01:00',venue:'Amex Stadium',score:[0,0],rating:2,up:2,down:14},
  {id:'m06',h:'TOT',a:'LIV',ko:'2026-10-24T12:30:00+01:00',venue:'Tottenham Hotspur Stadium',score:[1,2],rating:8,up:27,down:2},
  {id:'m07',h:'NEW',a:'CHE',ko:'2026-10-24T15:00:00+01:00',venue:"St James' Park",score:[2,3],rating:9,up:40,down:0},
  {id:'m08',h:'AVL',a:'ARS',ko:'2026-10-24T17:30:00+01:00',venue:'Villa Park',score:[0,1],rating:5,up:9,down:6},
  {id:'m09',h:'WHU',a:'BHA',ko:'2026-10-25T14:00:00+00:00',venue:'London Stadium',score:[2,1],rating:6,up:5,down:1},
  {id:'m10',h:'MUN',a:'MCI',ko:'2026-10-25T16:30:00+00:00',venue:'Old Trafford',score:[1,3],rating:8,up:15,down:2},
  {id:'m11',h:'ARS',a:'NEW',ko:'2026-10-31T12:30:00+00:00',venue:'Emirates Stadium'},
  {id:'m12',h:'CHE',a:'TOT',ko:'2026-10-31T15:00:00+00:00',venue:'Stamford Bridge'},
  {id:'m13',h:'LIV',a:'AVL',ko:'2026-10-31T17:30:00+00:00',venue:'Anfield'},
  {id:'m14',h:'MCI',a:'WHU',ko:'2026-11-01T14:00:00+00:00',venue:'Etihad Stadium'},
  {id:'m15',h:'BHA',a:'MUN',ko:'2026-11-01T16:30:00+00:00',venue:'Amex Stadium'}
];
