// Registers every scene. Minigame modules are loaded if present.
import './message.js';
import './title.js';
import './intro.js';
import './store.js';
import './travel.js';
import './common.js';
import './stop.js';
import './crossing.js';
import './map.js';
import './casino.js';
import './endings.js';

for (const m of ['./mg_forage.js', './mg_freeway.js', './mg_catchase.js']) {
  import(m).catch(() => { /* minigame not built yet: message.js falls back to a random outcome */ });
}
