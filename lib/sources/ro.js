// ROMÂNIA — Consiliul Concurenței, "Monitorul Prețurilor" (monitorulpreturilor.info), fără cheie.
// Acoperă rețelele mari: Petrom, OMV, Rompetrol, Lukoil, MOL, Socar, Gazprom (~1.300 de stații).
// Prețurile sunt raportate de rețele, de regulă o dată pe zi (noaptea).
//
// Limitele API-ului (verificate): rază maximă 5 km, maximum 50 de rezultate, un singur
// carburant pe cerere. De aceea împărțim fiecare dală în cercuri mici și întrebăm întâi de
// motorină: unde nu e nicio stație nu mai facem celelalte cereri.
import { fetchText, limiter } from '../http.js';
import { makeStation } from '../station.js';
import { bboxCenter, inBbox, splitBbox } from '../geo.js';
import { dmyToUtc } from '../time.js';
import { SECTIGO_DV_R36 } from '../certs.js';

const BASE = 'https://monitorulpreturilor.info/pmonsvc/Gas/GetGasItemsByLatLon';
const PRODUCTS = { 21: 'diesel', 11: 'e5', 12: 'e98', 22: 'dp', 31: 'lpg' };
const PROBE = 21; // motorina: o vând toate stațiile acestor rețele
const MAX_RESULTS = 50;

const BRANDS = {
  PETROM: 'Petrom', OMV: 'OMV', ROMPETROL: 'Rompetrol', LUKOIL: 'Lukoil',
  MOL: 'MOL', SOCAR: 'SOCAR', GAZPROM: 'Gazprom',
};

const run = limiter(6);

/** Cerere pentru un carburant în jurul unui punct. */
async function query(lat, lng, buffer, productId) {
  const url = `${BASE}?lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&buffer=${buffer}&CSVGasCatalogProductIds=${productId}&OrderBy=dist`;
  const res = await run(() => fetchText(url, {
    headers: { Accept: 'application/json' },
    ca: [SECTIGO_DV_R36], // lanțul TLS al serverului e incomplet; vezi lib/certs.js
    timeout: 15000,
    okStatuses: [500], // API-ul răspunde 500 când nu găsește nimic
  }));
  if (res.status === 500) return { Stations: [], Products: [] };
  // caractere de control ocazionale în date -> le eliminăm înainte de parsare
  const text = res.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!text || /^\{\s*\}$/.test(text)) return { Stations: [], Products: [] };
  return JSON.parse(text);
}

/** Unește răspunsurile (stații + prețuri) într-o listă de stații normalizate. */
export function parse(responses) {
  const stations = new Map();
  for (const json of responses) {
    for (const st of json?.Stations || []) {
      const key = `${st.network?.id || 'X'}:${st.id}`;
      if (!stations.has(key)) stations.set(key, { st, prices: {} });
    }
  }
  for (const json of responses) {
    for (const pr of json?.Products || []) {
      const key = `${pr.network?.id || 'X'}:${pr.stationid}`;
      const entry = stations.get(key);
      const fuel = PRODUCTS[pr.catprod?.id];
      if (!entry || !fuel || typeof pr.price !== 'number') continue;
      if (entry.prices[fuel] == null || pr.price < entry.prices[fuel]) entry.prices[fuel] = pr.price;
    }
  }
  const out = [];
  for (const [key, { st, prices }] of stations) {
    const loc = st.addr?.location || {};
    const s = makeStation({
      src: 'ro', id: key, lat: loc.Lat, lng: loc.Lon,
      brand: BRANDS[st.network?.id] || st.network?.name, name: st.name,
      addr: st.addr?.addrstring,
      cc: 'RO', cur: 'RON', prices,
      updated: dmyToUtc(st.updatedate, 'Europe/Bucharest'),
    });
    if (s) out.push(s);
  }
  return out;
}

/** Colectează răspunsurile pentru un sub-dreptunghi (cu subdivizare dacă sunt >= 50 stații). */
async function collect(rect, buffer, depth, acc) {
  const c = bboxCenter(rect);
  const probe = await query(c.lat, c.lng, buffer, PROBE);
  const n = probe.Stations?.length || 0;
  if (n === 0) return;
  if (n >= MAX_RESULTS && depth < 2) {
    // Zonă densă (ex. București): împărțim în 4 și înjumătățim raza
    await Promise.all(splitBbox(rect, 2, 2).map((q) => collect(q, Math.round(buffer / 2), depth + 1, acc)));
    return;
  }
  acc.push(probe);
  const others = Object.keys(PRODUCTS).map(Number).filter((id) => id !== PROBE);
  const res = await Promise.allSettled(others.map((id) => query(c.lat, c.lng, buffer, id)));
  for (const r of res) if (r.status === 'fulfilled') acc.push(r.value);
}

export default {
  id: 'ro',
  name: 'România',
  cc: 'RO',
  cur: 'RON',
  attribution: 'Consiliul Concurenței – Monitorul Prețurilor (monitorulpreturilor.info)',
  coverage: [[20.2, 43.6, 29.8, 48.3]],
  tile: [0.24, 0.18],
  ttl: 3 * 3600,
  complete: false, // lipsesc benzinăriile independente
  async fetchTile(bbox) {
    // 3×3 sub-dreptunghiuri de 0,08° × 0,06° (semi-diagonală < 5 km la latitudinea României)
    const acc = [];
    const results = await Promise.allSettled(splitBbox(bbox, 3, 3).map((rect) => collect(rect, 5000, 0, acc)));
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === results.length) throw failed[0].reason;
    const stations = parse(acc).filter((s) => inBbox(s.lat, s.lng, bbox));
    return { stations, partial: failed.length > 0 };
  },
};
