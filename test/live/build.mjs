// Construiește câte un pachet pentru browser per sursă, ca să rulăm adaptoarele pe datele reale.
import { build } from 'esbuild';
const out = process.argv[2];
const shim = {
  name: 'shim',
  setup(b) {
    b.onResolve({ filter: /\/http\.js$/ }, () => ({ path: new URL('./http-browser.js', import.meta.url).pathname }));
    b.onResolve({ filter: /data\/fr-names\.js$/ }, () => ({ path: 'fr-names', namespace: 'stub' }));
    b.onResolve({ filter: /data\/countries\.js$/ }, () => ({ path: 'countries', namespace: 'stub' }));
    b.onResolve({ filter: /\/certs\.js$/ }, () => ({ path: 'certs', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: a.path === 'certs' ? 'export const SECTIGO_DV_R36 = "";' : 'export default ' + (a.path === 'countries' ? '[]' : '{}') + ';', loader: 'js' }));
  },
};
for (const id of ['ro', 'md', 'fr', 'es', 'pt', 'it', 'de', 'at', 'si', 'hr', 'osm']) {
  await build({
    stdin: {
      contents: `import src from '../../lib/sources/${id}.js'; import { calls } from './http-browser.js';
        window.__gf = { src, calls, async run(bbox, ctx) { const t0 = performance.now(); const r = await src.fetchTile(bbox, ctx || { env: {}, completeSet: new Set() }); const st = Array.isArray(r) ? r : r.stations;
          const withPrice = st.filter((s) => Object.keys(s.p || {}).length);
          const fuels = {}; for (const s of st) for (const k of Object.keys(s.p || {})) fuels[k] = (fuels[k] || 0) + 1;
          return { ms: Math.round(performance.now() - t0), calls: calls.length, n: st.length, withPrice: withPrice.length, partial: !Array.isArray(r) && r.partial, fuels, sample: withPrice[0] || st[0] }; } };`,
      resolveDir: new URL('.', import.meta.url).pathname, loader: 'js',
    },
    bundle: true, format: 'iife', outfile: `${out}/live-${id}.js`, plugins: [shim], minify: true, logLevel: 'error',
  });
}
console.log('ok');
