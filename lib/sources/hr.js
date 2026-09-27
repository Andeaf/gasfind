// CROAȚIA — Ministerul Economiei, portalul "Cijene goriva" (mzoe-gor.hr), fără cheie.
// Un singur fișier JSON (~3,7 MB) cu toate cele ~900 de stații.
import { fetchJson, memo } from '../http.js';
import { makeStation, setMin } from '../station.js';
import { inBbox, parseNum } from '../geo.js';

const URL = 'https://mzoe-gor.hr/data.json';

// vrsta_goriva_id -> cheia noastră (păstrăm cel mai mic preț = varianta standard)
const TYPE = { 1: 'e5', 2: 'e5', 5: 'e98', 6: 'e98', 7: 'diesel', 8: 'diesel', 9: 'lpg' };

export function parse(json, fetchedAt = new Date().toISOString()) {
  const gorivo = new Map((json?.gorivos || []).map((g) => [g.id, g]));
  const company = new Map((json?.obvezniks || []).map((o) => [o.id, o.naziv]));
  const out = [];
  for (const st of json?.postajas || []) {
    // Câmpurile "lat" și "long" sunt inversate în sursă; în Croația latitudinea (42–47)
    // e mereu mai mare decât longitudinea (13–20), deci le putem deosebi sigur.
    const a = parseNum(st.lat), b = parseNum(st.long);
    if (a == null || b == null) continue;
    const lat = Math.max(a, b), lng = Math.min(a, b);
    const prices = {};
    for (const c of st.cjenici || []) {
      const g = gorivo.get(c.gorivo_id);
      const key = g && TYPE[g.vrsta_goriva_id];
      if (key) setMin(prices, key, parseNum(c.cijena));
    }
    const s = makeStation({
      src: 'hr', id: st.id, lat, lng,
      name: st.naziv, brand: shortCompany(company.get(st.obveznik_id)),
      addr: st.adresa, city: st.mjesto,
      cc: 'HR', cur: 'EUR', prices,
      updated: fetchedAt, updatedIsFetch: true,
    });
    if (s) out.push(s);
  }
  return out;
}

function shortCompany(name) {
  if (!name || name === '-') return undefined;
  const n = name.replace(/\s+(d\.o\.o\.|d\.d\.|j\.d\.o\.o\.)\.?$/i, '').trim();
  if (/^INA\b/i.test(n)) return 'INA';
  if (/^Petrol\b/i.test(n)) return 'Petrol';
  if (/^Tifon/i.test(n)) return 'Tifon';
  if (/^Crodux/i.test(n)) return 'Crodux';
  if (/^MOL\b/i.test(n)) return 'MOL';
  if (/^Shell/i.test(n)) return 'Shell';
  if (/^Lukoil/i.test(n)) return 'Lukoil';
  return n;
}

export default {
  id: 'hr',
  name: 'Croația',
  cc: 'HR',
  cur: 'EUR',
  attribution: 'Ministarstvo gospodarstva – Cijene goriva (mzoe-gor.hr)',
  coverage: [[13.4, 42.3, 19.5, 46.6]],
  tile: [0.5, 0.5],
  ttl: 1800,
  complete: true,
  async fetchTile(bbox) {
    const all = await memo('hr:all', 25 * 60e3, async () => parse(await fetchJson(URL, { timeout: 20000 })));
    return all.filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
