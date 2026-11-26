import { gfx, PAL, FONT_BODY, FONT_HEAD } from './engine/gfx.js';
import { input } from './engine/input.js';
import { assets } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { game } from './game/game.js';
import { NODES } from './data/route.js';
import { PARTY } from './data/party.js';
import { ITEMS } from './data/items.js';
import './scenes/index.js';

function manifest() {
  const k = [];
  for (const id of Object.keys(NODES)) k.push('scenes/' + id);
  for (const s of ['title', 'ending', 'gameover', 'campsite_night', 'walmart_night', 'breakdown']) k.push('scenes/' + s);
  for (const p of PARTY) for (const m of ['neutral', 'happy', 'sick']) k.push(`portraits/${p.id}_${m}`);
  for (const s of ['rv_side', 'rv_side_broken', 'rv_wheel', 'rv_top', 'joe_walk', 'caity_walk', 'bela_walk', 'muskrat_walk', 'pookah_walk', 'bela_run_side']) k.push('sprites/' + s);
  for (const b of ['coast', 'city', 'pass', 'valley', 'forest', 'oregon', 'oregon_coast', 'portland']) { k.push(`biomes/${b}_far`); k.push(`biomes/${b}_near`); }
  for (const m of ['forage_bg', 'bramble', 'bramble_ripe', 'berry', 'wasp', 'poison_oak', 'basket', 'road_tile', 'cars', 'semi', 'hazards', 'gas_can', 'reststop_bg']) k.push('minigame/' + m);
  for (const it of ITEMS) k.push('icons/' + it.icon);
  for (const i of ['money', 'water']) k.push('icons/' + i);
  k.push('ui/frame', 'ui/cursor');
  return k;
}

async function loadFonts() {
  const fonts = [
    new FontFace(FONT_BODY, 'url(assets/fonts/VT323-Regular.ttf)'),
    new FontFace(FONT_HEAD, 'url(assets/fonts/PressStart2P-Regular.ttf)'),
  ];
  await Promise.all(fonts.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => null)));
}

async function boot() {
  const canvas = document.getElementById('game');
  gfx.init(canvas);
  input.init(canvas);
  input.onFirstGesture = () => audio.init();

  let loading = true;
  const loadingLoop = () => {
    if (!loading) return;
    gfx.begin();
    gfx.rect(0, 0, 480, 300, PAL.ink);
    const p = assets.progress();
    gfx.text('Loading the Georgetown…', 240, 130, { size: 16, align: 'center' });
    gfx.rect(140, 155, 200, 8, '#000');
    gfx.rect(141, 156, Math.round(198 * p), 6, PAL.edge);
    gfx.end(0);
    requestAnimationFrame(loadingLoop);
  };
  requestAnimationFrame(loadingLoop);
  await loadFonts();
  await assets.loadAll(manifest());
  loading = false;

  const params = new URLSearchParams(location.search);
  const start = params.get('scene') || 'title';
  game.go(game.has(start) ? start : 'title', Object.fromEntries(params));
  window.game = game; // handy for debugging

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.tickFade(dt);
    gfx.begin();
    game.draw();
    gfx.end(dt);
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
