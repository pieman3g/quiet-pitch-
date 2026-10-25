/*
 * RATINGS: where the "worth watching" scores and votes come from.
 *
 * The rest of the site only ever calls these three functions, so you can swap this
 * whole file for a different source (a shared database, a calculated score...)
 * without touching the pages.
 *
 *   QPRatings.get(match)   -> { score, up, down, mine } or null if the game has no rating
 *                             mine: 1 = you voted up, -1 = voted down, 0 = no vote
 *   QPRatings.vote(id, d)  -> d is 1 (up) or -1 (down); voting the same way again undoes it
 *   QPRatings.clear()      -> forget this device's votes
 *
 * Right now: the score and base vote counts come from the match data, and your own
 * votes are stored only in this browser. They are not shared with other visitors.
 */
(() => {
  const KEY = 'qp_votes';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(votes)); } catch (e) {} };
  let votes = load();

  window.QPRatings = {
    get(m) {
      if (m.rating == null) return null;
      const v = votes[m.id] || 0;
      return { score: m.rating, up: (m.up || 0) + (v === 1 ? 1 : 0), down: (m.down || 0) + (v === -1 ? 1 : 0), mine: v };
    },
    vote(id, dir) { votes[id] = votes[id] === dir ? 0 : dir; save(); },
    clear() { votes = {}; save(); }
  };
})();
