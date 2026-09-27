// REPUBLICA MOLDOVA — ANRE, platforma "e-Carburanți" (date oficiale, fără cheie).
// Un singur JSON cu toate stațiile; coordonatele sunt în Web Mercator (EPSG:3857); prețuri în MDL.
import { fetchJson, memo } from '../http.js';
import { makeStation } from '../station.js';
import { inBbox, mercatorToLngLat, parseNum } from '../geo.js';

const URL = 'https://api.ecarburanti.anre.md/public/';

export function parse(list, fetchedAt = new Date().toISOString()) {
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    if (r.station_status === 4) continue; // inactivă
    const x = parseNum(r.x), y = parseNum(r.y);
    if (x == null || y == null) continue;
    const { lat, lng } = mercatorToLngLat(x, y);
    const street = [r.fullstreet, r.addrnum].filter(Boolean).join(' ');
    const s = makeStation({
      // sursa nu are id de stație: folosim codul fiscal + poziția (stabile)
      src: 'md', id: `${r.idno || 'x'}-${Math.round(x)}-${Math.round(y)}`,
      lat, lng,
      brand: r.station_name, name: r.company_name,
      addr: street || (r.roadkm != null ? `km ${r.roadkm}` : undefined),
      city: [r.bua, r.lev2].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      cc: 'MD', cur: 'MDL',
      prices: { diesel: parseNum(r.diesel), e5: parseNum(r.gasoline), lpg: parseNum(r.gpl) },
      updated: fetchedAt, updatedIsFetch: true,
    });
    if (s) out.push(s);
  }
  return out;
}

export default {
  id: 'md',
  name: 'Republica Moldova',
  cc: 'MD',
  cur: 'MDL',
  attribution: 'ANRE – e-Carburanți (ecarburanti.anre.md)',
  coverage: [[26.6, 45.4, 30.2, 48.5]],
  tile: [0.5, 0.5],
  ttl: 3600,
  complete: true,
  async fetchTile(bbox) {
    const all = await memo('md:all', 55 * 60e3, async () => parse(await fetchJson(URL, { timeout: 20000 })));
    return all.filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
