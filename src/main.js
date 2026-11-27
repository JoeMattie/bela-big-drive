import { gfx, PAL, FONT_BODY, FONT_HEAD, W, H } from './engine/gfx.js';
import { input } from './engine/input.js';
import { assets } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { initLayout } from './engine/layout.js';
import { game } from './game/game.js';
import { NODES } from './data/route.js';
import { PARTY } from './data/party.js';
import { ITEMS } from './data/items.js';
import './scenes/index.js';

function manifest() {
  const k = [];
  for (const id of Object.keys(NODES)) k.push('scenes/' + id);
  for (const s of ['title', 'title_portrait', 'ending', 'gameover', 'campsite_night', 'walmart_night', 'breakdown']) k.push('scenes/' + s);
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

const NO_SWIPE = new Set(['forage', 'freeway', 'catchase', 'travel']);

async function boot() {
  const canvas = document.getElementById('game');
  gfx.init(canvas);
  initLayout();
  input.init(canvas);
  input.onFirstGesture = () => audio.init();

  let loading = true;
  const loadingLoop = () => {
    if (!loading) return;
    gfx.begin();
    gfx.rect(0, 0, W, H, PAL.ink);
    const p = assets.progress();
    gfx.text('Loading the Georgetown…', W / 2, H / 2 - 20, { size: 16, align: 'center' });
    gfx.rect(W / 2 - 100, H / 2 + 5, 200, 8, '#000');
    gfx.rect(W / 2 - 99, H / 2 + 6, Math.round(198 * p), 6, PAL.edge);
    gfx.end(0);
    requestAnimationFrame(loadingLoop);
  };
  requestAnimationFrame(loadingLoop);
  await loadFonts();
  await assets.loadAll(manifest());
  loading = false;

  const params = new URLSearchParams(location.search);
  const start = params.get('scene') || 'title';
  // debug helpers: ?scene=travel&leg=sacramento&weather=rain&month=7&noevents
  if (params.has('noevents')) window.BBD_NOEVENTS = 1;
  if (params.has('freeze')) window.BBD_FREEZE = 1;
  if (params.get('month')) game.state.reset('fresh', Number(params.get('month')));
  if (params.get('leg')) { game.state.node = params.get('leg'); game.state.startLeg(Number(params.get('fork') || 0)); }
  if (params.get('at')) game.state.node = params.get('at');
  if (params.get('weather')) game.state.weather = params.get('weather');
  game.go(game.has(start) ? start : 'title', Object.fromEntries(params));
  window.game = game; // handy for debugging

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // swipes steer menus/cursors everywhere except action minigames
    const top = game.top();
    if (input.swipes.length && top && !NO_SWIPE.has(top.name)) {
      for (const sw of input.swipes) input.pressed.push({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[sw]);
    }
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
