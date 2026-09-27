// Logica API-ului, independentă de platformă (Vercel sau serverul local din server.js).
//   GET /api/config                 -> sursele active, cursuri valutare
//   GET /api/tile?s=ro&x=..&y=..    -> benzinăriile unei dale pentru o sursă
//   GET /api/detail?s=it&id=..      -> detalii suplimentare (adresă) pentru o stație
import { ALL_SOURCES, enabledSources, findSource, completeCountries } from './registry.js';
import { tileBbox, bboxIntersects } from './geo.js';
import { getRates } from './fx.js';
import { mockTile } from './mock.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(status, body, cache) {
  return {
    status,
    headers: { ...JSON_HEADERS, 'Cache-Control': cache || 'no-store' },
    body: JSON.stringify(body),
  };
}

function cacheFor(seconds, browser = 60) {
  return `public, max-age=${Math.min(browser, seconds)}, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`;
}

const isMock = (env) => env.GASFIND_MOCK === '1';

export async function handleConfig(env) {
  const sources = (isMock(env) ? ALL_SOURCES : enabledSources(env)).map((s) => ({
    id: s.id, name: s.name, cc: s.cc, cur: s.cur, tile: s.tile, coverage: s.coverage,
    ttl: s.ttl, complete: Boolean(s.complete), attribution: s.attribution, detail: Boolean(s.detail),
  }));
  const fx = isMock(env) ? { base: 'EUR', rates: { RON: 5.28, MDL: 20.0 }, source: 'mock' } : await getRates();
  return json(200, {
    version: 1,
    sources,
    deMissingKey: !isMock(env) && !env.TANKERKOENIG_API_KEY,
    fx,
  }, cacheFor(3600, 300));
}

export async function handleTile(params, env) {
  const id = params.get('s');
  const x = Number(params.get('x')), y = Number(params.get('y'));
  const src = isMock(env) ? ALL_SOURCES.find((s) => s.id === id) : findSource(id, env);
  if (!src) return json(404, { error: `Sursă necunoscută sau inactivă: ${id}` });
  if (!Number.isInteger(x) || !Number.isInteger(y)) return json(400, { error: 'x și y trebuie să fie numere întregi' });
  const bbox = tileBbox(src.tile, x, y);
  if (!src.coverage.some((c) => bboxIntersects(c, bbox))) {
    return json(200, { s: id, x, y, bbox, fetched: new Date().toISOString(), stations: [] }, cacheFor(86400));
  }
  if (isMock(env)) {
    return json(200, { s: id, x, y, bbox, fetched: new Date().toISOString(), stations: mockTile(src, bbox, x, y) }, 'no-store');
  }
  const started = Date.now();
  try {
    const res = await src.fetchTile(bbox, { env, completeSet: completeCountries(env) });
    const stations = Array.isArray(res) ? res : res.stations;
    const partial = !Array.isArray(res) && Boolean(res.partial);
    const ttl = partial ? Math.min(src.ttl, 300) : src.ttl;
    return json(200, { s: id, x, y, bbox, fetched: new Date().toISOString(), ms: Date.now() - started, partial, stations }, cacheFor(ttl));
  } catch (e) {
    const status = e.name === 'RateLimitError' ? 503 : 502;
    const out = json(status, { s: id, x, y, error: e.message || String(e) });
    if (e.retryAfter) out.headers['Retry-After'] = String(e.retryAfter);
    console.error(`[tile ${id} ${x},${y}]`, e.message);
    return out;
  }
}

export async function handleDetail(params, env) {
  const src = findSource(params.get('s'), env);
  const id = String(params.get('id') || '');
  if (!src || !src.detail) return json(404, { error: 'Detalii indisponibile pentru această sursă' });
  if (!/^[\w.:-]{1,64}$/.test(id)) return json(400, { error: 'id invalid' });
  try {
    return json(200, await src.detail(id), cacheFor(86400, 3600));
  } catch (e) {
    return json(502, { error: e.message || String(e) });
  }
}

/** Rutare comună pentru serverul local. */
export async function route(pathname, params, env) {
  if (pathname === '/api/config') return handleConfig(env);
  if (pathname === '/api/tile') return handleTile(params, env);
  if (pathname === '/api/detail') return handleDetail(params, env);
  return null;
}
