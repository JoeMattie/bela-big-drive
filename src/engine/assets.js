// Image loader. Missing files are tolerated: get() returns null and callers
// draw a procedural placeholder instead, so code never blocks on art.

const BASE = 'assets/';

class Assets {
  constructor() {
    this.images = new Map(); // key -> HTMLImageElement | null (missing)
    this.total = 0;
    this.done = 0;
  }

  // keys are paths relative to assets/ without extension, e.g. 'scenes/portland'
  loadAll(keys) {
    const uniq = [...new Set(keys)].filter((k) => !this.images.has(k));
    this.total += uniq.length;
    return Promise.all(uniq.map((k) => this.load(k)));
  }

  load(key) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); this.done++; resolve(img); };
      img.onerror = () => { this.images.set(key, null); this.done++; resolve(null); };
      img.src = BASE + key + '.png?v=' + (window.BBD_VERSION || '1');
    });
  }

  get(key) {
    return this.images.get(key) || null;
  }

  progress() {
    return this.total ? this.done / this.total : 1;
  }
}

export const assets = new Assets();
