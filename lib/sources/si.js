// SLOVENIA — goriva.si (portal lansat de Ministerul Dezvoltării Economice), fără cheie.
// Lista națională are ~550 de stații (25 pe pagină); o descărcăm întreagă și o ținem în cache.
import { fetchJson, memo, limiter } from '../http.js';
import { makeStation } from '../station.js';
import { inBbox } from '../geo.js';

const SEARCH = 'https://goriva.si/api/v1/search/?position=&radius=';
const FRANCHISE = 'https://goriva.si/api/v1/franchise/';

// Mărci cunoscute (numele din API sunt ale firmelor)
const BRAND_SHORT = [[/^petrol\b/i, 'Petrol'], [/^mol/i, 'MOL'], [/^shell/i, 'Shell'], [/^ina\b/i, 'INA'], [/^omv/i, 'OMV']];

export function parse(results, franchises = {}, fetchedAt = new Date().toISOString()) {
  const out = [];
  for (const r of results || []) {
    const pr = r.prices || {};
    const prices = {
      e5: pr['95'],
      diesel: pr.dizel,
      e98: pr['98'] ?? pr['100'],
      lpg: pr['avtoplin-lpg'],
      dp: pr['dizel-premium'],
    };
    let brand = franchises[r.franchise];
    if (brand) for (const [re, short] of BRAND_SHORT) if (re.test(brand)) { brand = short; break; }
    const s = makeStation({
      src: 'si', id: r.pk, lat: r.lat, lng: r.lng,
      name: r.name, brand, addr: r.address,
      city: r.zip_code || undefined,
      cc: 'SI', cur: 'EUR', prices,
      updated: fetchedAt, updatedIsFetch: true,
      extra: r.open_hours ? { hours: String(r.open_hours).trim() } : undefined,
    });
    if (s) out.push(s);
  }
  return out;
}

const run = limiter(5);

async function loadAll() {
  return memo('si:all', 25 * 60e3, async () => {
    const [first, fr] = await Promise.all([
      fetchJson(SEARCH, { timeout: 15000 }),
      memo('si:franchise', 24 * 3600e3, () => fetchJson(FRANCHISE, { timeout: 15000 })).catch(() => []),
    ]);
    const franchises = Object.fromEntries((fr || []).map((f) => [f.pk, f.name]));
    const perPage = first.results?.length || 25;
    const pages = Math.min(60, Math.ceil((first.count || 0) / perPage));
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      run(() => fetchJson(`${SEARCH}&page=${i + 2}`, { timeout: 15000 }))));
    const all = [first, ...rest].flatMap((p) => p.results || []);
    return parse(all, franchises);
  });
}

export default {
  id: 'si',
  name: 'Slovenia',
  cc: 'SI',
  cur: 'EUR',
  attribution: 'goriva.si – Republica Slovenia',
  coverage: [[13.3, 45.4, 16.7, 46.9]],
  tile: [0.5, 0.5],
  ttl: 1800,
  complete: true,
  async fetchTile(bbox) {
    return (await loadAll()).filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
