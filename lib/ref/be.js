// BELGIA — prețuri MAXIME oficiale (SPF Economie – DG Énergie), publicate de Statbel în be.STAT:
// „Tarif officiel produits pétroliers – dernière mise à jour”, JSON, EUR/L cu TVA, o listă pe zi
// (tariful de a doua zi apare în dimineața zilei lucrătoare precedente). Licență CC BY 4.0
// (statbel.fgov.be/fr/open-data); SPF Economie: CC0 cu recomandarea de a cita sursa și data.
import { fetchJson } from '../http.js';
import { round } from '../geo.js';

const URL_DAILY = 'https://bestat.statbel.fgov.be/bestat/api/views/9e9cf394-6c54-4d81-8013-7124a8c4bf15/result/JSON';
const PRODUCTS = [
  [/^Essence 95 RON E5\b/i, 'e5'], [/^Essence 95 RON E10\b/i, 'e10'], [/^Essence 98 RON E5\b/i, 'e98'],
  [/^Diesel B7\b/i, 'diesel'], [/^Autogas LPG \(à la pompe\)/i, 'lpg'],
];
const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

/** "28SEP26" -> "2026-09-28" */
export function parseDay(s) {
  const m = String(s || '').trim().toUpperCase().match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!m || !MONTHS[m[2]]) return null;
  return `20${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function parse(json) {
  const facts = Array.isArray(json?.facts) ? json.facts : [];
  // ziua cea mai recentă din listă
  const days = [...new Set(facts.map((f) => parseDay(f.Jour)).filter(Boolean))].sort();
  const date = days.at(-1);
  if (!date) throw new Error('BE: nicio zi în răspunsul be.STAT');
  const p = {};
  for (const f of facts) {
    if (parseDay(f.Jour) !== date) continue;
    const key = (PRODUCTS.find(([re]) => re.test(String(f.Produit || ''))) || [])[1];
    const v = f['Prix TVA incl.'];
    if (key && typeof v === 'number' && v > 0) p[key] = round(v, 3);
  }
  if (p.diesel == null || (p.e5 == null && p.e10 == null)) throw new Error('BE: produsele așteptate lipsesc');
  return { BE: { kind: 'max', cur: 'EUR', p, date } };
}

export default {
  id: 'be',
  name: 'SPF Economie – prețuri maxime oficiale, via Statbel be.STAT (CC BY 4.0)',
  short: 'preț maxim SPF Economie',
  url: 'https://economie.fgov.be/fr/themes/energie/prix-de-lenergie/prix-maximum-des-produits',
  license: 'CC BY 4.0',
  ttl: 3 * 3600,
  async fetch() {
    return parse(await fetchJson(URL_DAILY, { timeout: 15000 }));
  },
};
