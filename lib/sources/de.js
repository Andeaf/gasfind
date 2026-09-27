// GERMANIA — Tankerkönig (datele MTS-K ale Bundeskartellamt), licență CC BY 4.0 cu atribuire
// obligatorie (link către www.tankerkoenig.de). Necesită o cheie API gratuită
// (https://onboarding.tankerkoenig.de) -> variabila de mediu TANKERKOENIG_API_KEY.
// Cheia nu apare niciodată în cod, teste, loguri sau răspunsuri (nici în mesajele de eroare).
//
// Regulile Tankerkönig (emailul de activare + https://creativecommons.tankerkoenig.de/swagger/):
//   - cel mult O cerere pe minut per cheie; rază de căutare max. 25 km;
//   - cereri doar când utilizatorul se uită la hartă (fără interogări periodice, fără descărcări
//     în masă; limite mai mari există doar în API-ul comercial, pe care nu-l folosim);
//   - datele nu se dau firmelor din industria petrolieră (condițiile MTS-K).
//
// Folosim un singur endpoint, api/v4/stations/search (documentat în Swagger; dă și ora ultimei
// schimbări de preț), o singură cerere pe dală; dala stă 10 minute în cache-ul CDN.
// Limita de o cerere pe minut e respectată în două locuri:
//   - aici, per instanță de server: dacă am chemat API-ul acum < 60 s răspundem 503 + Retry-After
//     fără să-l mai chemăm; la fel când Tankerkönig răspunde 503;
//   - în client (public/app.js): o singură cerere DE în curs și min. 61 s între două cereri care
//     ajung la Tankerkönig (răspunsurile din cache-ul CDN nu consumă din limită).
import { fetchJson, HttpError } from '../http.js';
import { makeStation } from '../station.js';
import { bboxCenter, bboxHalfDiagonalKm, inBbox } from '../geo.js';
import { isoToUtc } from '../time.js';

const V4 = 'https://creativecommons.tankerkoenig.de/api/v4/stations/search';
const FUEL_V4 = { 'Super E5': 'e5', 'Super E10': 'e10', Diesel: 'diesel' };
export const MIN_INTERVAL_MS = 60_000;

let lastCall = 0; // momentul ultimei cereri către Tankerkönig din această instanță

export class RateLimitError extends Error {
  constructor(retryAfter = 60) {
    super(`Tankerkönig: limită de o cerere pe minut, încearcă peste ${retryAfter} s`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** Doar pentru teste: uită momentul ultimei cereri. */
export function resetRateGate() { lastCall = 0; }

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

export default {
  id: 'de',
  name: 'Germania',
  cc: 'DE',
  cur: 'EUR',
  attribution: 'MTS-K prin Tankerkönig (CC BY 4.0)',
  attributionUrl: 'https://www.tankerkoenig.de',
  coverage: [[5.8, 47.2, 15.1, 55.1]],
  tile: [0.45, 0.3],
  ttl: 600,
  // Prețurile vin o dală pe minut; până atunci harta arată stațiile din OpenStreetMap (fără preț),
  // pe care clientul le unește cu cele Tankerkönig. De aceea Germania NU e marcată „completă”.
  complete: false,
  enabled: (env) => Boolean(env.TANKERKOENIG_API_KEY),
  async fetchTile(bbox, { env }) {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) throw new RateLimitError(Math.max(1, Math.ceil(wait / 1000)));
    lastCall = Date.now();
    const c = bboxCenter(bbox);
    const rad = Math.min(25, Math.ceil((bboxHalfDiagonalKm(bbox) + 0.3) * 10) / 10);
    const q = `lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}&rad=${rad}&apikey=${encodeURIComponent(env.TANKERKOENIG_API_KEY)}`;
    let json;
    try {
      json = await fetchJson(`${V4}?${q}`, { timeout: 15000, retries: 0 }); // retries: 0 = nicio a doua cerere în același minut
    } catch (e) {
      if (e instanceof HttpError && e.status === 503) throw new RateLimitError(60);
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) throw new Error('Tankerkönig: cheie API invalidă');
      throw new Error(`Tankerkönig: ${e.message}`); // fără e.url, care conține cheia
    }
    if (json && json.ok === false) throw new Error(`Tankerkönig: ${String(json.message || 'eroare').slice(0, 120)}`);
    return parseV4(json).filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
