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
      cc: src.cc || 'HU', cur, prices, times, // stațiile OSM false sunt în Ungaria (țară fără prețuri pe stație)
      open: r() > 0.1,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Prețuri de referință false: medii UE pentru câteva țări, maxim legal pentru BE și LU. */
export function mockRef() {
  const base = { HU: 1.58, BG: 1.45, PL: 1.5, CZ: 1.62, SK: 1.6, GR: 1.75, NL: 2.05, BE: 1.9, LU: 1.65, RO: 1.55, AT: 1.7, DE: 1.85, FR: 1.8, HR: 1.55, SI: 1.55, IT: 1.75, ES: 1.45 };
  const countries = {};
  for (const [cc, d] of Object.entries(base)) {
    const max = cc === 'BE' || cc === 'LU';
    countries[cc] = { kind: max ? 'max' : 'avg', cur: 'EUR', p: { diesel: d, e5: +(d - 0.1).toFixed(3), lpg: +(d * 0.45).toFixed(3) }, date: '2026-09-21', src: max ? 'mockmax' : 'wob' };
  }
  return {
    version: 1, fetched: new Date().toISOString(),
    sources: {
      wob: { name: 'Buletinul petrolier săptămânal al Comisiei Europene (medii naționale, CC BY 4.0)', short: 'Buletinul petrolier UE', url: 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en', license: 'CC BY 4.0' },
      mockmax: { name: 'Preț maxim oficial (date de test)', short: 'maxim oficial (test)', url: 'https://example.org', license: '' },
    },
    countries,
  };
}
