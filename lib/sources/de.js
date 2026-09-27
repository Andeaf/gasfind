// GERMANIA — Tankerkönig (date MTS-K de la Bundeskartellamt), licență CC BY 4.0.
// Necesită o cheie API gratuită: https://onboarding.tankerkoenig.de  -> variabila TANKERKOENIG_API_KEY
// Reguli Tankerkönig: rază max. 25 km, cereri doar la acțiunea utilizatorului, max ~1 cerere/minut
// pentru aceeași interogare (noi păstrăm rezultatele 10 minute în cache).
import { fetchJson, HttpError } from '../http.js';
import { makeStation } from '../station.js';
import { bboxCenter, bboxHalfDiagonalKm, inBbox } from '../geo.js';
import { isoToUtc } from '../time.js';

const V4 = 'https://creativecommons.tankerkoenig.de/api/v4/stations/search';
const LEGACY = 'https://creativecommons.tankerkoenig.de/json/list.php';

const FUEL_V4 = { 'Super E5': 'e5', 'Super E10': 'e10', Diesel: 'diesel' };

export class RateLimitError extends Error {
  constructor() { super('Tankerkönig: limită de cereri, încearcă peste un minut'); this.name = 'RateLimitError'; this.retryAfter = 60; }
}

export function parseV4(json) {
  const out = [];
  for (const r of json?.stations || []) {
    const prices = {}, times = {};
    for (const f of r.fuels || []) {
      const key = FUEL_V4[f.name] || (f.category === 'diesel' ? 'diesel' : null);
      if (!key || typeof f.price !== 'number') continue;
      prices[key] = f.price;
      const t = isoToUtc(f.lastChange?.timestamp);
      if (t) times[key] = t;
    }
    const s = makeStation({
      src: 'de', id: r.id, lat: r.coords?.lat, lng: r.coords?.lng,
      name: r.name, brand: r.brand, addr: r.street,
      city: [r.postalCode, r.place].filter(Boolean).join(' '),
      cc: 'DE', cur: 'EUR', prices, times,
      open: typeof r.isOpen === 'boolean' ? r.isOpen : undefined,
    });
    if (s) out.push(s);
  }
  return out;
}

export function parseLegacy(json) {
  const out = [];
  for (const r of json?.stations || []) {
    const prices = {};
    for (const k of ['e5', 'e10', 'diesel']) if (typeof r[k] === 'number' && r[k] > 0) prices[k] = r[k];
    const pc = r.postCode != null ? String(r.postCode).padStart(5, '0') : '';
    const s = makeStation({
      src: 'de', id: r.id, lat: r.lat, lng: r.lng,
      name: r.name, brand: r.brand,
      addr: [r.street, r.houseNumber].filter(Boolean).join(' '),
      city: [pc, r.place].filter(Boolean).join(' '),
      cc: 'DE', cur: 'EUR', prices,
      open: typeof r.isOpen === 'boolean' ? r.isOpen : undefined,
      updated: new Date().toISOString(), updatedIsFetch: true,
    });
    if (s) out.push(s);
  }
  return out;
}

export default {
  id: 'de',
  name: 'Germania',
  cc: 'DE',
  cur: 'EUR',
  attribution: 'Tankerkönig / MTS-K (CC BY 4.0) – www.tankerkoenig.de',
  coverage: [[5.8, 47.2, 15.1, 55.1]],
  tile: [0.45, 0.3],
  ttl: 600,
  complete: true,
  enabled: (env) => Boolean(env.TANKERKOENIG_API_KEY),
  async fetchTile(bbox, { env }) {
    const key = env.TANKERKOENIG_API_KEY;
    const c = bboxCenter(bbox);
    const rad = Math.min(25, Math.ceil((bboxHalfDiagonalKm(bbox) + 0.3) * 10) / 10);
    const q = `lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}&rad=${rad}&apikey=${encodeURIComponent(key)}`;
    let stations;
    try {
      stations = parseV4(await fetchJson(`${V4}?${q}`, { timeout: 15000, retries: 0 }));
    } catch (e) {
      if (e instanceof HttpError && e.status === 503) throw new RateLimitError();
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) throw new Error('Tankerkönig: cheie API invalidă');
      // v4 nu e documentat oficial; dacă nu merge, revenim la API-ul clasic
      const json = await fetchJson(`${LEGACY}?${q}&sort=dist&type=all`, { timeout: 15000, retries: 0 }).catch((e2) => {
        if (e2 instanceof HttpError && e2.status === 503) throw new RateLimitError();
        throw e2;
      });
      if (json && json.ok === false) throw new Error(`Tankerkönig: ${json.message || 'eroare'}`);
      stations = parseLegacy(json);
    }
    return stations.filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
