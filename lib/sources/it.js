// ITALIA — MIMIT "Osservaprezzi carburanti" (Ministero delle Imprese e del Made in Italy).
// Folosim API-ul site-ului oficial carburanti.mise.gov.it (căutare pe zonă, rază max. 10 km).
import { fetchJson, limiter } from '../http.js';
import { makeStation } from '../station.js';
import { bboxCenter, bboxHalfDiagonalKm, inBbox, splitBbox } from '../geo.js';
import { isoToUtc } from '../time.js';

const ZONE = 'https://carburanti.mise.gov.it/ospzApi/search/zone';
const DETAIL = 'https://carburanti.mise.gov.it/ospzApi/registry/servicearea/';

// fuelId -> cheia noastră (produsele "premium" au id-uri proprii pe fiecare rețea)
const FUEL_BY_ID = {
  1: 'e5', // Benzina
  2: 'diesel', // Gasolio
  4: 'lpg', // GPL
  5: 'e98', 7: 'e98', 8: 'e98', 26: 'e98', 28: 'e98', 29: 'e98', // Blue Super, WR 100, V-Power, HiQ Perform+...
  6: 'dp', 9: 'dp', 10: 'dp', 13: 'dp', 20: 'dp', 27: 'dp', 231: 'dp', 327: 'dp', 328: 'dp', 341: 'dp', // Blue Diesel, Hi-Q...
};

export function parse(json) {
  const out = [];
  for (const r of json?.results || []) {
    // Pentru fiecare carburant: prețul self-service dacă există, altfel cel cu servire
    const best = {};
    for (const f of r.fuels || []) {
      const key = FUEL_BY_ID[f.fuelId];
      if (!key || typeof f.price !== 'number' || f.price <= 0) continue;
      const cur = best[key];
      const better = !cur || (f.isSelf && !cur.isSelf) || (f.isSelf === cur.isSelf && f.price < cur.price);
      if (better) best[key] = f;
    }
    const prices = {};
    let self = false;
    for (const [k, f] of Object.entries(best)) {
      prices[k] = f.price;
      if (f.isSelf) self = true;
    }
    const s = makeStation({
      src: 'it', id: r.id, lat: r.location?.lat, lng: r.location?.lng,
      brand: r.brand && r.brand !== 'Pompe Bianche' ? r.brand : undefined,
      name: r.brand === 'Pompe Bianche' ? 'Pompă independentă' : undefined,
      addr: r.address || undefined,
      cc: 'IT', cur: 'EUR', prices,
      updated: isoToUtc(r.insertDate),
      extra: self ? { self: true } : undefined,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Detalii (adresa lipsește din căutarea pe zonă). */
export async function detail(id) {
  const r = await fetchJson(DETAIL + encodeURIComponent(id), { timeout: 10000 });
  return {
    addr: r.address || undefined,
    name: r.nomeImpianto && !/^\d+$/.test(r.nomeImpianto) ? r.nomeImpianto : undefined,
    company: r.company || undefined,
  };
}

const run = limiter(4);

export default {
  id: 'it',
  name: 'Italia',
  cc: 'IT',
  cur: 'EUR',
  attribution: 'MIMIT – Osservaprezzi carburanti (IODL 2.0)',
  coverage: [[6.6, 35.4, 18.6, 47.1]],
  tile: [0.3, 0.24],
  ttl: 900,
  complete: true,
  async fetchTile(bbox) {
    // 2×2 cercuri; fiecare sub-dreptunghi are semi-diagonala < 10 km (limita API-ului)
    const parts = splitBbox(bbox, 2, 2);
    const results = await Promise.allSettled(parts.map((part) => run(async () => {
      const c = bboxCenter(part);
      const radius = Math.min(10, Math.ceil((bboxHalfDiagonalKm(part) + 0.2) * 10) / 10);
      const body = JSON.stringify({ points: [{ lat: c.lat, lng: c.lng }], radius });
      return parse(await fetchJson(ZONE, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, timeout: 15000 }));
    })));
    const ok = results.filter((r) => r.status === 'fulfilled');
    if (!ok.length) throw results[0].reason;
    const seen = new Map();
    for (const r of ok) for (const s of r.value) if (inBbox(s.lat, s.lng, bbox)) seen.set(s.id, s);
    return { stations: [...seen.values()], partial: ok.length < results.length };
  },
  detail,
};
