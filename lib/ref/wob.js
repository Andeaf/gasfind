// UE — Buletinul petrolier săptămânal al Comisiei Europene (Weekly Oil Bulletin), fișierul
// „Prices with taxes – latest prices”: prețuri MEDII naționale cu taxe, în EUR la 1000 L, pentru cele
// 27 de state membre (fără UK, NO, CH). Datele sunt de luni și apar joia (~3 zile întârziere).
// Licență CC BY 4.0 (Decizia 2011/833/UE privind reutilizarea documentelor Comisiei; commission.europa.eu/legal-notice_en).
// Linkul din pagină are un UUID neschimbat de ani; îl căutăm totuși în pagină și păstrăm UUID-ul ca rezervă.
import { fetchText, fetchBuffer } from '../http.js';
import { readXlsx, excelDate, isZip } from '../xlsx.js';
import { round } from '../geo.js';

export const PAGE = 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en';
const FALLBACK_FILE = 'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en';

const NAMES = {
  Austria: 'AT', Belgium: 'BE', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY', Czechia: 'CZ', 'Czech Republic': 'CZ',
  Denmark: 'DK', Estonia: 'EE', Finland: 'FI', France: 'FR', Germany: 'DE', Greece: 'GR', Hungary: 'HU', Ireland: 'IE',
  Italy: 'IT', Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Malta: 'MT', Netherlands: 'NL', Poland: 'PL',
  Portugal: 'PT', Romania: 'RO', Slovakia: 'SK', Slovenia: 'SI', Spain: 'ES', Sweden: 'SE',
};

/** Linkul fișierului „Prices with taxes – latest prices” din pagina buletinului (sau UUID-ul cunoscut). */
export function findFileUrl(html) {
  const h = String(html);
  const m = h.match(/<a\b[^>]*href="(\/document\/download\/[0-9a-f-]{36}_en[^"]*)"[^>]*data-untranslated-label="Prices with taxes latest prices/i)
    || h.match(/href="(\/document\/download\/[0-9a-f-]{36}_en\?filename=[^"]*with%20Taxes[^"]*\.xlsx)"/i);
  return m ? new URL(m[1].replace(/&amp;/g, '&'), PAGE).href : FALLBACK_FILE;
}

/** Rândurile foii -> { RO: { kind: 'avg', cur: 'EUR', p: { e5, diesel, lpg }, date }, ... } */
export function parse(rows) {
  const hi = rows.findIndex((r) => r.some((c) => /euro-super/i.test(String(c ?? ''))));
  if (hi < 0) throw new Error('WOB: antetul „Euro-super 95” nu a fost găsit');
  const header = rows[hi].map((c) => String(c ?? ''));
  if (!/EUR/i.test(header[0])) throw new Error(`WOB: monedă neașteptată (${header[0].slice(0, 30)})`);
  const col = (re) => header.findIndex((h) => re.test(h));
  const cols = { e5: col(/euro-super/i), diesel: col(/automotive gas oil|gas oil automobile|diesel/i), lpg: col(/\bLPG\b|\bGPL\b/i) };
  if (cols.e5 < 0 || cols.diesel < 0) throw new Error('WOB: coloanele de benzină/motorină lipsesc');
  const units = rows[hi + 1] || [];
  const date = excelDate(units[0]);
  if (!date) throw new Error('WOB: data prețurilor lipsește (A2)');
  const out = {};
  for (const r of rows.slice(hi + 2)) {
    const cc = NAMES[String(r[0] ?? '').replace(/\s+/g, ' ').trim()];
    if (!cc) continue;
    const p = {};
    for (const [k, i] of Object.entries(cols)) {
      if (i < 0) continue;
      const v = r[i];
      if (typeof v !== 'number' || !(v > 0)) continue;
      const per = /1000/.test(String(units[i] ?? '')) ? 1000 : 1;
      p[k] = round(v / per, 3);
    }
    if (Object.keys(p).length) out[cc] = { kind: 'avg', cur: 'EUR', p, date };
  }
  if (Object.keys(out).length < 20) throw new Error(`WOB: doar ${Object.keys(out).length} țări găsite`);
  return out;
}

export default {
  id: 'wob',
  name: 'Buletinul petrolier săptămânal al Comisiei Europene (medii naționale, CC BY 4.0)',
  short: 'Buletinul petrolier UE',
  url: PAGE,
  license: 'CC BY 4.0',
  ttl: 6 * 3600,
  async fetch() {
    let file = FALLBACK_FILE;
    try { file = findFileUrl((await fetchText(PAGE, { timeout: 12000 })).text); } catch { /* pagina nu răspunde: folosim UUID-ul cunoscut */ }
    const res = await fetchBuffer(file, { timeout: 20000 });
    if (!isZip(res.buffer)) throw new Error('WOB: fișierul descărcat nu e XLSX');
    return parse(readXlsx(res.buffer).rows(0));
  },
};
