// LUXEMBURG — prețuri MAXIME oficiale (Ministère de l'Économie), publicate de STATEC în LUSTAT
// (setul „Prix de l'énergie” de pe data.public.lu, licență CC0). API SDMX fără cheie, CSV:
// o observație per schimbare de preț, cu data „à partir du”; EUR/L cu TVA.
import { fetchText } from '../http.js';
import { round } from '../geo.js';

const BASE = 'https://lustat.statec.lu/rest/data/LU1,DSD_PRIX_ESSENCE@';
const FLOWS = ['DF_E5301', 'DF_E5302', 'DF_E5305']; // benzină (SP95, SP98), motorină, GPL
const CODES = { SP95: 'e5', SP98: 'e98', DIE: 'diesel', LPG: 'lpg' };
const HEADERS = { Accept: 'application/vnd.sdmx.data+csv;labels=both' };

/** CSV simplu cu ghilimele -> rânduri de câmpuri. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Fișierele CSV SDMX (unul per flux) -> { LU: { kind: 'max', cur: 'EUR', p, date } } */
export function parse(csvTexts) {
  const latest = {}; // cheie carburant -> { date, value }
  for (const text of csvTexts) {
    const rows = parseCsv(text);
    const header = rows[0] || [];
    const col = (name) => header.findIndex((h) => h.split(':')[0].trim() === name);
    const iFuel = col('MOTOR_ENERGY'), iDate = col('TIME_PERIOD'), iVal = col('OBS_VALUE'), iUnit = col('UNIT_MEASURE');
    if (iFuel < 0 || iDate < 0 || iVal < 0) continue;
    for (const r of rows.slice(1)) {
      if (iUnit >= 0 && r[iUnit] && !/^EUR_LI\b/.test(r[iUnit])) continue;
      const key = CODES[String(r[iFuel] || '').split(':')[0].trim()];
      const v = Number(r[iVal]), date = String(r[iDate] || '').slice(0, 10);
      if (!key || !Number.isFinite(v) || v <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!latest[key] || date > latest[key].date) latest[key] = { date, value: round(v, 3) };
    }
  }
  if (!latest.diesel || !latest.e5) throw new Error('LU: seriile SP95/DIE lipsesc');
  const p = Object.fromEntries(Object.entries(latest).map(([k, x]) => [k, x.value]));
  const date = Object.values(latest).map((x) => x.date).sort().at(-1);
  return { LU: { kind: 'max', cur: 'EUR', p, date } };
}

export default {
  id: 'lu',
  name: 'Ministère de l’Économie – prix maxima, via STATEC/LUSTAT (data.public.lu, CC0)',
  short: 'preț maxim oficial (Luxemburg)',
  url: 'https://data.public.lu/fr/datasets/economie-totale-et-prix-prix-prix-de-lenergie/',
  license: 'CC0',
  ttl: 3 * 3600,
  async fetch() {
    const texts = await Promise.all(FLOWS.map((f) => fetchText(`${BASE}${f},1.0/all?lastNObservations=1`, { headers: HEADERS, timeout: 15000 }).then((r) => r.text)));
    return parse(texts);
  },
};
