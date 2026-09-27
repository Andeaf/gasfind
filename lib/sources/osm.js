// OPENSTREETMAP — benzinăriile (fără preț) din țările unde nu avem o sursă completă de prețuri.
// Date © contribuitorii OpenStreetMap (ODbL), prin Overpass API. Se păstrează 14 zile în cache.
import { fetchJson } from '../http.js';
import { makeStation } from '../station.js';
import { makeOsmFilter, tileTouchesIncomplete } from '../countries.js';

// Serverele publice Overpass sunt des aglomerate. Pornim cererea pe primul server și, dacă nu
// răspunde în câteva secunde, o trimitem eșalonat și la următoarele; câștigă primul răspuns bun.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const STAGGER_MS = 4000;
const BUDGET_MS = 45000;

const FUEL_TAGS = [['fuel:diesel', 'diesel'], ['fuel:octane_95', 'e5'], ['fuel:e10', 'e10'], ['fuel:octane_98', 'e98'], ['fuel:octane_100', 'e98'], ['fuel:lpg', 'lpg'], ['fuel:cng', 'cng']];

export function parse(json) {
  const out = [];
  for (const el of json?.elements || []) {
    const t = el.tags || {};
    if (['private', 'no'].includes(t.access)) continue;
    if (t.boat === 'yes' && t.motorcar !== 'yes' && !t['fuel:diesel'] && !t['fuel:octane_95']) continue; // doar pentru bărci
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    const fuels = [...new Set(FUEL_TAGS.filter(([k]) => t[k] === 'yes').map(([, v]) => v))];
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    const s = makeStation({
      src: 'osm', id: `${el.type[0]}${el.id}`, lat, lng,
      brand: t.brand || t.operator, name: t.name,
      addr: street, city: [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' '),
      cur: null,
      extra: fuels.length ? { fuels } : undefined,
    });
    if (s) out.push(s);
  }
  return out;
}

async function query(url, body, timeout) {
  const json = await fetchJson(url, {
    method: 'POST', timeout, retries: 0,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  // Overpass poate răspunde 200 cu o eroare în "remark" (ex. timeout pe server)
  if (!Array.isArray(json?.elements) || (/error/i.test(json.remark || '') && !json.elements.length)) {
    throw new Error(`Overpass: ${String(json?.remark || 'răspuns invalid').slice(0, 80)}`);
  }
  return json;
}

export function overpass([w, s, e, n], endpoints = ENDPOINTS, staggerMs = STAGGER_MS, budgetMs = BUDGET_MS) {
  const q = `[out:json][timeout:25];nwr["amenity"="fuel"](${s},${w},${n},${e});out center tags;`;
  const body = 'data=' + encodeURIComponent(q);
  return new Promise((resolve, reject) => {
    const started = endpoints.map(() => false);
    const timers = [];
    let done = false, failed = 0, lastErr;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      fn(value);
    };
    const start = (i) => {
      if (done || i >= endpoints.length || started[i]) return;
      started[i] = true;
      clearTimeout(timers[i]);
      query(endpoints[i], body, Math.max(3000, budgetMs - i * staggerMs)).then(
        (json) => finish(resolve, json),
        (err) => {
          lastErr = err;
          failed++;
          if (failed === endpoints.length) finish(reject, lastErr);
          else start(i + 1); // a picat repede: nu mai așteptăm, pornim următorul server
        },
      );
    };
    endpoints.forEach((_, i) => { timers[i] = setTimeout(() => start(i), i * staggerMs); });
  });
}

export default {
  id: 'osm',
  name: 'OpenStreetMap (fără prețuri)',
  cc: null,
  cur: null,
  attribution: '© contribuitorii OpenStreetMap (ODbL)',
  coverage: [[-25, 34, 45, 71.5]],
  tile: [0.25, 0.25],
  ttl: 14 * 24 * 3600,
  complete: false,
  async fetchTile(bbox, { completeSet }) {
    if (!(await tileTouchesIncomplete(bbox, completeSet))) return [];
    const keep = await makeOsmFilter(completeSet);
    const out = [];
    for (const st of parse(await overpass(bbox))) {
      if (st.lng < bbox[0] || st.lng >= bbox[2] || st.lat < bbox[1] || st.lat >= bbox[3]) continue;
      const k = keep(st.lat, st.lng);
      if (!k.keep) continue;
      if (k.cc) st.cc = k.cc;
      out.push(st);
    }
    return out;
  },
};
