// Date false, deterministe, pentru testarea interfeței fără internet (GASFIND_MOCK=1).
import { makeStation } from './station.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const BRANDS = { RON: ['Petrom', 'OMV', 'Rompetrol', 'Lukoil', 'MOL'], MDL: ['Petrom', 'Lukoil', 'Rompetrol'], EUR: ['Shell', 'Aral', 'TotalEnergies', 'Eni', 'Repsol', 'OMV'] };
const BASE = { RON: { diesel: 10.9, e5: 9.8, e98: 10.6, lpg: 4.6, dp: 11.5 }, MDL: { diesel: 36.8, e5: 34.3, lpg: 17 }, EUR: { diesel: 2.2, e5: 2.15, e10: 2.1, e98: 2.3, lpg: 1.05, dp: 2.35 } };

export function mockTile(src, bbox, x, y) {
  const r = rng((x * 73856093) ^ (y * 19349663) ^ src.id.charCodeAt(0));
  const n = src.id === 'osm' ? 15 : 40;
  const cur = src.cur || null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const lat = bbox[1] + (bbox[3] - bbox[1]) * r();
    const lng = bbox[0] + (bbox[2] - bbox[0]) * r();
    const prices = {}, times = {};
    if (cur) {
      for (const [k, v] of Object.entries(BASE[cur])) {
        if (r() < 0.12 && k !== 'diesel') continue;
        prices[k] = +(v * (0.93 + r() * 0.14)).toFixed(cur === 'EUR' ? 3 : 2);
        times[k] = new Date(Date.now() - r() * 3 * 86400e3).toISOString();
      }
    }
    const brands = BRANDS[cur] || ['Station'];
    const s = makeStation({
      src: src.id, id: `m${x}_${y}_${i}`, lat, lng,
      brand: brands[Math.floor(r() * brands.length)], name: `Stația ${i + 1}`,
      addr: `Strada Test ${i + 1}`, city: 'Localitate',
      cc: src.cc || undefined, cur, prices, times,
      open: r() > 0.1,
    });
    if (s) out.push(s);
  }
  return out;
}
