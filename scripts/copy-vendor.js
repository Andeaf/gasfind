// Copiază MapLibre GL (hărți, licență BSD-3) din node_modules în public/vendor.
// Rulare după `npm install`: node scripts/copy-vendor.js
import { copyFileSync, mkdirSync } from 'node:fs';

const from = new URL('../node_modules/maplibre-gl/', import.meta.url);
const to = new URL('../public/vendor/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const f of ['dist/maplibre-gl.mjs', 'dist/maplibre-gl-shared.mjs', 'dist/maplibre-gl-worker.mjs', 'dist/maplibre-gl.css', 'LICENSE.txt']) {
  const name = f.split('/').pop().replace('LICENSE.txt', 'maplibre-LICENSE.txt');
  copyFileSync(new URL(f, from), new URL(name, to));
  console.log('copiat', name);
}
