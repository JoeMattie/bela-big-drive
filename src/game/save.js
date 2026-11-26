import { GameState } from './state.js';

const KEY = 'bbd_save_v1';
const HOF = 'bbd_hof_v1';
const REVIEWS = 'bbd_reviews_v1';

function get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } }
function del(k) { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } }

export function saveGame(s) { set(KEY, JSON.stringify(s.toJSON())); }
export function hasSave() { return !!get(KEY); }
export function clearSave() { del(KEY); }
export function loadGame() {
  try { const o = JSON.parse(get(KEY)); return o ? GameState.fromJSON(o) : null; } catch (_) { return null; }
}

const DEFAULT_HOF = [
  { name: 'Barb & Her Solar Panels', score: 9200, rank: 'RV Legend' },
  { name: 'The Van Life Couple', score: 6100, rank: 'Road Warrior' },
  { name: 'Dale (Mobile Tire Svc)', score: 4400, rank: 'Road Warrior' },
  { name: 'A Prius Full of Ferrets', score: 2900, rank: 'Weekend Warrior' },
  { name: 'Guy Eating Cereal on I-5', score: 1500, rank: 'Greenhorn' },
];
export function getHOF() {
  try { const o = JSON.parse(get(HOF)); if (Array.isArray(o) && o.length) return o; } catch (_) { /* ignore */ }
  return DEFAULT_HOF.slice();
}
export function addHOF(entry) {
  const l = getHOF();
  l.push(entry);
  l.sort((a, b) => b.score - a.score);
  const out = l.slice(0, 10);
  set(HOF, JSON.stringify(out));
  return out.indexOf(entry);
}

// Player-left reviews shown at landmarks in future runs (like graffiti on the road).
export function getReviews() {
  try { return JSON.parse(get(REVIEWS)) || {}; } catch (_) { return {}; }
}
export function addReview(nodeId, review) {
  const r = getReviews();
  (r[nodeId] = r[nodeId] || []).push(review);
  r[nodeId] = r[nodeId].slice(-3);
  set(REVIEWS, JSON.stringify(r));
}
