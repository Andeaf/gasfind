// DANEMARCA — API-urile publice de prețuri ale companiilor, obligatorii prin lege din 1.01.2026
// (Prismærkningsbekendtgørelsen § 16a; ghidul KFST cere acces public, fără aprobare manuală, ~1 cerere/s).
// Un singur adaptor pentru toate companiile. Fiecare API dă TOATĂ țara într-un răspuns, așa că îl
// descărcăm o dată la 10 minute (memo) și filtrăm pe dală. Fără cheie: OK, Shell (DCC Energi), Q8/F24,
// OIL!, Circle K + INGO. Cu cheie, opționale și inactive fără variabilele de mediu: Go'on (GOON_API_KEY,
// max. 1 cerere/30 s) și Uno-X (UNOX_CLIENT_ID + UNOX_CLIENT_SECRET, OAuth2 client credentials, 1 cerere/30 s).
// Q8/F24 și Circle K/INGO nu publică coordonate: le avem în lib/data/dk-sites.js, geocodate o singură dată
// cu DAWA (API-ul oficial al adreselor) de scripts/build-dk-sites.js; stațiile noi, fără coordonate, sunt sărite.
// Prețurile sunt în DKK/L cu TVA. Benzina 95 standard e E10 în Danemarca, de aceea apare și la „Benzină 95”
// (e5) și la „E10”; variantele premium 95 (E5) doar la e5, unde câștigă prețul minim.
// Documentațiile nu conțin licențe sau restricții de reutilizare: cităm compania ca sursă.
import { fetchJson, memo } from '../http.js';
import { makeStation, setMin } from '../station.js';
import { inBbox } from '../geo.js';
import { isoToUtc, localIsoToUtc } from '../time.js';

const TZ = 'Europe/Copenhagen';
const TTL_MS = 600e3;

let SITES; // { 'q8:8001': [lat, lng], 'ck:10103': [lat, lng] }
async function sites() {
  SITES ||= (await import('../data/dk-sites.js')).default;
  return SITES;
}
/** Doar pentru teste. */
export function _setSitesForTests(m) { SITES = m; }

/** Cheile noastre de carburant pentru numele unui produs danez; null = ignorat (AdBlue, HVO, curent, benzină 92). */
export function fuelKeys(name) {
  const n = String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!n || /adblue|hvo|bio100|neste|hpc|kwh|opladning|\bel\b|(^|\D)92(\D|$)/.test(n)) return null;
  if (/diesel|\bdi\b/.test(n)) return /extra|\+|plus|v-power|premium/.test(n) ? ['dp'] : ['diesel'];
  if (/(^|\D)(98|100)(\D|$)|v-power/.test(n)) return ['e98'];
  if (/(^|\D)95(\D|$)|blyfri|benzin/.test(n)) return /extra|\+|plus|upgrade/.test(n) ? ['e5'] : ['e5', 'e10'];
  return null;
}

/** Adaugă un preț la toate cheile lui (minimul câștigă) și ora, dacă există. */
function addPrice(prices, times, name, value, time) {
  const keys = fuelKeys(name);
  const v = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (!keys || !Number.isFinite(v) || v <= 0) return;
  for (const k of keys) {
    setMin(prices, k, v);
    if (time && (prices[k] === v || !times[k])) times[k] = time;
  }
}

const joinAddr = (...parts) => parts.filter(Boolean).join(' ');

/** OK: { items: [{ facility_number, street, house_number, postal_code, city, coordinates, last_updated_time, prices: [{ product_name, price }] }] } */
export function parseOk(json) {
  const out = [];
  for (const r of json?.items || []) {
    const prices = {}, times = {};
    for (const p of r.prices || []) addPrice(prices, times, p.product_name, p.price);
    const s = makeStation({
      src: 'dk', id: `ok${r.facility_number}`, lat: r.coordinates?.latitude, lng: r.coordinates?.longitude,
      brand: 'OK', name: `OK ${r.city || ''}`.trim(), addr: joinAddr(r.street, r.house_number), city: joinAddr(r.postal_code, r.city),
      cc: 'DK', cur: 'DKK', prices, updated: isoToUtc(r.last_updated_time),
    });
    if (s) out.push(s);
  }
  return out;
}

/** Shell (DCC Energi): [{ stationId, brand, street, houseNumber, postalCode, city, coordinates: { latitude: "..", longitude: ".." }, prices: [{ productName, octane, price: "..", lastUpdated }] }] */
export function parseShell(json) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const prices = {}, times = {};
    for (const p of r.prices || []) addPrice(prices, times, `${p.productName || ''} ${p.octane || ''}`, p.price, localIsoToUtc(p.lastUpdated, TZ));
    const s = makeStation({
      src: 'dk', id: `sh${r.stationId}`, lat: parseFloat(r.coordinates?.latitude), lng: parseFloat(r.coordinates?.longitude),
      brand: r.brand || 'Shell', name: `${r.brand || 'Shell'} ${r.city || ''}`.trim(), addr: joinAddr(r.street, r.houseNumber), city: joinAddr(r.postalCode, r.city),
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Q8 / F24: { data: { stationsPrices: [{ stationId, stationName, address, products: [{ productName, price, priceChangeDate }] }] } } — fără coordonate, rânduri duplicate. */
export function parseQ8(json, siteCoords) {
  const byId = new Map();
  for (const r of json?.data?.stationsPrices || []) {
    const latest = (r.products || []).map((p) => p.priceChangeDate || '').sort().at(-1) || '';
    const prev = byId.get(r.stationId);
    if (!prev || latest > prev.latest) byId.set(r.stationId, { r, latest });
  }
  const out = [];
  for (const { r } of byId.values()) {
    const c = siteCoords?.[`q8:${r.stationId}`];
    if (!c) continue; // stație nouă, negeocodată încă (vezi scripts/build-dk-sites.js)
    const prices = {}, times = {};
    for (const p of r.products || []) addPrice(prices, times, p.productName, p.price, localIsoToUtc(p.priceChangeDate, TZ));
    const brand = /q8/i.test(r.stationName || '') ? 'Q8' : 'F24';
    const s = makeStation({
      src: 'dk', id: `q8${r.stationId}`, lat: c[0], lng: c[1],
      brand, name: `${brand} ${String(r.address || '').split(/\s+/).slice(0, 2).join(' ')}`.trim(), addr: String(r.address || '').replace(/\s+Danmark$/i, ''),
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

/** OIL! tank & go: câte un răspuns per carburant, [{ station_id, station_name, address, gps: "55.27 N, 9.90 E", "95E10": 18.09, updated }] */
export function parseOil(lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const r of Array.isArray(list) ? list : []) {
      const e = byId.get(r.station_id) || { r, prices: {}, times: {} };
      const time = localIsoToUtc(r.updated, TZ);
      for (const [k, v] of Object.entries(r)) if (/^(95E10|DieselB7|BIO100_Diesel|AdBlue)$/i.test(k)) addPrice(e.prices, e.times, k, v, time);
      byId.set(r.station_id, e);
    }
  }
  const out = [];
  for (const { r, prices, times } of byId.values()) {
    const g = String(r.gps || '').match(/([\d.]+)\s*([NS]),\s*([\d.]+)\s*([EW])/i);
    const lat = g ? parseFloat(g[1]) * (g[2].toUpperCase() === 'S' ? -1 : 1) : NaN;
    const lng = g ? parseFloat(g[3]) * (g[4].toUpperCase() === 'W' ? -1 : 1) : NaN;
    const [addr, city] = String(r.address || '').split(/,\s*/);
    const s = makeStation({
      src: 'dk', id: `oil${r.station_id}`, lat, lng, brand: 'OIL!', name: r.station_name, addr, city,
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Circle K + INGO: { sites: [{ id, name, address: { street, city, postalCode }, fuelPrices: [{ displayName, price, lastUpdated }] }] } — fără coordonate. */
export function parseCircleK(json, siteCoords) {
  const out = [];
  for (const r of json?.sites || []) {
    const c = siteCoords?.[`ck:${r.id}`];
    if (!c) continue;
    const prices = {}, times = {};
    for (const p of r.fuelPrices || []) addPrice(prices, times, p.displayName, p.price, isoToUtc(p.lastUpdated));
    const brand = /^INGO/i.test(r.name || '') ? 'INGO' : 'Circle K';
    const name = String(r.name || '').replace(/^(CIRCLE K|INGO)\s*/i, '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
    const s = makeStation({
      src: 'dk', id: `ck${r.id}`, lat: c[0], lng: c[1], brand, name: `${brand} ${name}`.trim(),
      addr: r.address?.street, city: joinAddr(r.address?.postalCode, r.address?.city),
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Go'on (cu cheie): { stations: [{ stationId, brand, street, houseNumber, postalCode, city, coordinates, prices: [{ productName, price, lastUpdated }] }] } */
export function parseGoon(json) {
  const out = [];
  for (const r of json?.stations || []) {
    const prices = {}, times = {};
    for (const p of r.prices || []) addPrice(prices, times, p.productName, p.price, isoToUtc(p.lastUpdated));
    const s = makeStation({
      src: 'dk', id: `go${r.stationId}`, lat: r.coordinates?.latitude, lng: r.coordinates?.longitude,
      brand: r.brand || "Go'on", name: `${r.brand || "Go'on"} ${r.city || ''}`.trim(), addr: joinAddr(r.street, r.houseNumber), city: joinAddr(r.postalCode, r.city),
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Uno-X (cu cheie): { Data: [{ stationId, stationName, brand, address: { addressHouseNumber, postalCode, city, coordinates: { latitude: "55,56", longitude } }, products: [{ productName, price, lastUpdated: "2025-11-26 11:21:13.210000" (UTC) }] }] */
export function parseUnox(json) {
  const out = [];
  const num = (v) => parseFloat(String(v ?? '').replace(',', '.'));
  const utc = (v) => isoToUtc(String(v || '').trim().replace(' ', 'T').replace(/(\.\d+)?$/, 'Z'));
  for (const r of json?.Data || json?.data || []) {
    const prices = {}, times = {};
    for (const p of r.products || []) addPrice(prices, times, p.productName, p.price, utc(p.lastUpdated));
    const a = r.address || {};
    const s = makeStation({
      src: 'dk', id: `ux${r.stationId}`, lat: num(a.coordinates?.latitude), lng: num(a.coordinates?.longitude),
      brand: r.brand || 'Uno-X', name: r.stationName, addr: a.addressHouseNumber, city: joinAddr(a.postalCode, a.city),
      cc: 'DK', cur: 'DKK', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

async function unoxToken(env) {
  return memo('dk:unox:token', 800e3, async () => {
    const basic = Buffer.from(`${env.UNOX_CLIENT_ID}:${env.UNOX_CLIENT_SECRET}`).toString('base64');
    const res = await fetchJson('https://auth.unoxmobility.net/realms/production-api-gateway/protocol/openid-connect/token', {
      method: 'POST', timeout: 15000, retries: 0, body: 'grant_type=client_credentials',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res?.access_token) throw new Error('Uno-X: token lipsă în răspuns');
    return res.access_token;
  }, { staleMs: 0 });
}

const OPTS = { timeout: 20000 };
export const COMPANIES = [
  { id: 'ok', name: 'OK', load: async () => parseOk(await fetchJson('https://mobility-prices.ok.dk/api/v1/fuel-prices', OPTS)) },
  { id: 'shell', name: 'Shell (DCC Energi)', load: async () => parseShell(await fetchJson('https://shellpumpepriser.geoapp.me/v1/prices', OPTS)) },
  { id: 'q8', name: 'Q8 / F24', load: async () => parseQ8(await fetchJson('https://beta.q8.dk/Station/GetStationPrices?page=1&pageSize=2000', OPTS), await sites()) },
  { id: 'oil', name: 'OIL! tank & go', load: async () => parseOil(await Promise.all(['95E10', 'DieselB7'].map((f) => fetchJson(`https://apim-fuel-prices-prod.azure-api.net/Oil-FuelPrices/prices?fuelType=${f}`, OPTS)))) },
  { id: 'circlek', name: 'Circle K / INGO', load: async () => parseCircleK(await fetchJson('https://api.circlek.com/eu/prices/v1/fuel/countries/DK', { ...OPTS, headers: { 'X-App-Name': 'PRICES' } }), await sites()) },
  { id: 'goon', name: "Go'on", enabled: (env) => Boolean(env.GOON_API_KEY),
    load: async (env) => parseGoon(await fetchJson('https://goon.nu/wp-json/goon/v1/pump-prices', { ...OPTS, retries: 0, headers: { Authorization: `Bearer ${env.GOON_API_KEY}` } })) },
  { id: 'unox', name: 'Uno-X', enabled: (env) => Boolean(env.UNOX_CLIENT_ID && env.UNOX_CLIENT_SECRET),
    load: async (env) => parseUnox(await fetchJson('https://api.unoxmobility.net/gasstations/v1/getStationsAndPrices', { ...OPTS, retries: 0, headers: { Authorization: `Bearer ${await unoxToken(env)}` } })) },
];

export default {
  id: 'dk',
  name: 'Danemarca',
  cc: 'DK',
  cur: 'DKK',
  attribution: 'API-urile publice ale companiilor OK, Shell, Q8/F24, OIL!, Circle K și INGO (obligatorii prin legea daneză)',
  coverage: [[8.0, 54.5, 15.3, 57.8]],
  tile: [0.5, 0.3],
  ttl: 600,
  complete: false, // ~1.600 din ~2.000 de stații; restul apar din OpenStreetMap, iar clientul unește dublurile
  async fetchTile(bbox, { env }) {
    const active = COMPANIES.filter((c) => !c.enabled || c.enabled(env));
    const results = await Promise.allSettled(active.map((c) => memo(`dk:${c.id}`, TTL_MS, () => c.load(env), { staleMs: 6 * 3600e3 })));
    results.forEach((r, i) => { if (r.status === 'rejected') console.error(`[dk ${active[i].id}]`, r.reason?.message || r.reason); });
    const ok = results.filter((r) => r.status === 'fulfilled');
    if (!ok.length) throw new Error(`Danemarca: ${results[0].reason?.message || 'nicio companie nu a răspuns'}`);
    return { stations: ok.flatMap((r) => r.value).filter((s) => inBbox(s.lat, s.lng, bbox)), partial: ok.length < results.length };
  },
};
