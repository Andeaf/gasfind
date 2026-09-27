// AUSTRIA — E-Control "Spritpreisrechner" (autoritatea de reglementare), fără cheie.
// Legea austriacă publică doar stațiile cele mai ieftine: API-ul întoarce ~10 stații în jurul
// unui punct, iar doar cele mai ieftine 5 au preț. Restul benzinăriilor apar din OpenStreetMap.
import { fetchJson } from '../http.js';
import { makeStation } from '../station.js';
import { bboxCenter } from '../geo.js';

const BASE = 'https://api.e-control.at/sprit/1.0/search/gas-stations/by-address';
const TYPES = [['DIE', 'diesel'], ['SUP', 'e5']];

export function parse(list, fuelKey) {
  const out = [];
  if (!Array.isArray(list)) throw new Error('E-Control: răspuns neașteptat (mentenanță?)');
  for (const r of list) {
    const prices = {};
    for (const p of r.prices || []) {
      const key = p.fuelType === 'DIE' ? 'diesel' : p.fuelType === 'SUP' ? 'e5' : fuelKey;
      if (typeof p.amount === 'number' && p.amount > 0) prices[key] = p.amount;
    }
    const loc = r.location || {};
    const s = makeStation({
      src: 'at', id: r.id, lat: loc.latitude, lng: loc.longitude,
      name: r.name, addr: loc.address,
      city: [loc.postalCode, loc.city].filter(Boolean).join(' '),
      cc: 'AT', cur: 'EUR', prices,
      open: typeof r.open === 'boolean' ? r.open : undefined,
      updated: new Date().toISOString(), updatedIsFetch: true,
    });
    if (s) out.push(s);
  }
  return out;
}

export default {
  id: 'at',
  name: 'Austria',
  cc: 'AT',
  cur: 'EUR',
  attribution: 'E-Control – Spritpreisrechner (spritpreisrechner.at)',
  coverage: [[9.5, 46.3, 17.2, 49.1]],
  tile: [0.2, 0.15],
  ttl: 900,
  complete: false, // doar cele mai ieftine stații au preț
  async fetchTile(bbox) {
    const c = bboxCenter(bbox);
    const results = await Promise.allSettled(TYPES.map(async ([code, key]) => {
      const url = `${BASE}?latitude=${c.lat.toFixed(5)}&longitude=${c.lng.toFixed(5)}&fuelType=${code}&includeClosed=true`;
      return parse(await fetchJson(url, { timeout: 12000 }), key);
    }));
    const ok = results.filter((r) => r.status === 'fulfilled');
    if (!ok.length) throw results[0].reason;
    // Unim cele două liste (motorină + benzină) pe stație. NU tăiem la marginea dalei:
    // stațiile sunt reale, iar aplicația le unește după id.
    const byId = new Map();
    for (const r of ok) {
      for (const s of r.value) {
        const prev = byId.get(s.id);
        if (prev) Object.assign(prev.p, s.p);
        else byId.set(s.id, s);
      }
    }
    return { stations: [...byId.values()], partial: ok.length < results.length };
  },
};
