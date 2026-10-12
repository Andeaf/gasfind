// Verificarea săptămânală a producției, rulată de .github/workflows/verificare.yml: câte o cerere pe
// sursă (o dală dintr-un oraș cu benzinării sigure), cu un parametru anti-cache (&cb=...), ca răspunsul
// să vină de la sursă, nu din CDN; apoi /api/ref. Pică (cod de ieșire 1, deci GitHub trimite email) dacă:
//   - o sursă nu răspunde (după o reîncercare la 30 s), nu are stații sau are date vechi;
//   - copia OSM săptămânală e mai veche de 10 zile;
//   - /api/ref nu conține țările așteptate (media UE pentru UE-27, maximele legale BE, LU, RS, ME)
//     sau are date mai vechi decât pragul sursei.
// Germania e sărită: Tankerkönig permite cereri doar la acțiunea unui utilizator.
// Rulare: node scripts/check-prod.js [https://gasfind-three.vercel.app]
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'https://gasfind-three.vercel.app';
const UA = { 'User-Agent': 'GasFind-verificare/1.0 (verificare saptamanala)' };
const SKIP = { de: 'sărită: Tankerkönig permite cereri doar la acțiunea unui utilizator' };
// [lat, lng, oraș]: dala sursei care conține punctul (orice sursă nouă are nevoie de un punct aici)
export const PROBE = {
  ro: [44.43, 26.1, 'București'], md: [47.01, 28.86, 'Chișinău'], fr: [48.85, 2.35, 'Paris'],
  es: [40.42, -3.7, 'Madrid'], pt: [38.72, -9.14, 'Lisabona'], it: [41.9, 12.5, 'Roma'],
  at: [48.2, 16.37, 'Viena'], si: [46.05, 14.5, 'Ljubljana'], hr: [45.81, 15.98, 'Zagreb'],
  dk: [55.68, 12.57, 'Copenhaga'], cy: [35.17, 33.36, 'Nicosia'], osm: [47.5, 19.04, 'Budapesta'],
};
const PRICE_MAX_DAYS = 7; // ca în aplicație: prețurile mai vechi sunt gri
const OSM_MAX_DAYS = 10; // copia OSM e refăcută în fiecare luni
export const EU27 = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
// sursa așteptată pentru fiecare țară cu preț maxim legal și vechimea maximă (zile) a datelor fiecărei surse
export const REF_SRC = { BE: 'be', LU: 'lu', RS: 'rs', ME: 'me' };
const REF_MAX_DAYS = { wob: 21, be: 14, lu: 45, rs: 14, me: 14 };

const DAY = 86400e3;
const ageDays = (iso, now) => (now - Date.parse(iso)) / DAY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path, timeout = 60000) {
  const res = await fetch(BASE + path, { headers: UA, signal: AbortSignal.timeout(timeout) });
  let body = null;
  try { body = await res.json(); } catch { /* nu e JSON */ }
  if (!res.ok) throw new Error(`HTTP ${res.status}${body?.error ? `: ${body.error}` : ''}`);
  if (!body) throw new Error('răspuns care nu e JSON');
  return body;
}

/** Cea mai nouă oră de preț dintr-o dală (ignoră stațiile la care sursa dă doar ora descărcării). */
export function newestPriceTime(stations) {
  let best = null;
  for (const s of stations) {
    if (s.uf) continue;
    for (const t of [...Object.values(s.t || {}), s.u]) {
      const v = Date.parse(t);
      if (Number.isFinite(v) && (best == null || v > best)) best = v;
    }
  }
  return best;
}

/** Verifică o dală: [ok, mesaj]. */
export function checkTile(src, body, now = Date.now()) {
  const st = body.stations || [];
  if (!st.length) return [false, 'nicio stație'];
  const notes = [`${st.length} stații`];
  if (body.partial) notes.push('parțial (o parte a sursei n-a răspuns)');
  if (src.id === 'osm') {
    if (!body.snapshot) return [false, `${notes.join(', ')}; fără copia săptămânală (doar Overpass)`];
    const d = ageDays(body.snapshot, now);
    notes.push(`copia din ${body.snapshot.slice(0, 10)}`);
    if (d > OSM_MAX_DAYS) return [false, `${notes.join(', ')}: copia OSM are ${Math.floor(d)} zile`];
    return [true, notes.join(', ')];
  }
  const newest = newestPriceTime(st);
  if (newest == null) return [true, `${notes.join(', ')}; sursa nu dă ora prețului`];
  const d = (now - newest) / DAY;
  notes.push(`cel mai nou preț: ${new Date(newest).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  if (d > PRICE_MAX_DAYS) return [false, `${notes.join(', ')}: date vechi (${Math.floor(d)} zile)`];
  return [true, notes.join(', ')];
}

/** Verifică /api/ref: lista de probleme (goală = în regulă). */
export function checkRef(ref, now = Date.now()) {
  const problems = [];
  const countries = ref?.countries || {};
  for (const cc of new Set([...EU27, ...Object.keys(REF_SRC)])) {
    const e = countries[cc];
    const want = REF_SRC[cc] || 'wob';
    if (!e) { problems.push(`${cc}: lipsește`); continue; }
    if (e.src !== want) { problems.push(`${cc}: vine din „${e.src}”, nu din „${want}” (sursa de preț maxim a picat?)`); continue; }
    const d = ageDays(e.date, now);
    if (!(d <= REF_MAX_DAYS[want])) problems.push(`${cc}: date vechi (${e.date}, prag ${REF_MAX_DAYS[want]} zile)`);
  }
  return problems;
}

async function main() {
  const now = Date.now();
  const cb = `cb=${now.toString(36)}`;
  const rows = [];
  let failed = 0;
  const report = (name, ok, msg) => { rows.push([name, ok, msg]); if (!ok) failed++; console.log(`${ok ? 'OK  ' : 'PICĂ'} ${name}: ${msg}`); };

  let cfg;
  try { cfg = await getJson(`/api/config?${cb}`); } catch (e) { report('config', false, e.message); }
  for (const src of cfg?.sources || []) {
    if (SKIP[src.id]) { rows.push([src.id, null, SKIP[src.id]]); console.log(`--   ${src.id}: ${SKIP[src.id]}`); continue; }
    const p = PROBE[src.id];
    if (!p) { report(src.id, false, 'niciun punct de verificare în scripts/check-prod.js (PROBE)'); continue; }
    const x = Math.floor(p[1] / src.tile[0]), y = Math.floor(p[0] / src.tile[1]);
    const path = `/api/tile?s=${src.id}&x=${x}&y=${y}&${cb}`;
    let result;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = checkTile(src, await getJson(path), now);
      } catch (e) {
        result = [false, `nu răspunde (${e.message})`];
      }
      if (result[0]) break;
      if (attempt === 0) { console.log(`     ${src.id}: ${result[1]}; reîncerc peste 30 s`); await sleep(30000); }
    }
    report(`${src.id} (${p[2]})`, ...result);
  }

  try {
    const problems = checkRef(await getJson(`/api/ref?${cb}`), now);
    report('ref', !problems.length, problems.length ? problems.join('; ') : `UE-27 + ${Object.keys(REF_SRC).join(', ')} prezente și la zi`);
  } catch (e) {
    report('ref', false, `nu răspunde (${e.message})`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['| sursă | stare | detalii |', '|---|---|---|', ...rows.map(([n, ok, m]) => `| ${n} | ${ok == null ? '–' : ok ? '✅' : '❌'} | ${m.replace(/\|/g, '/')} |`)];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## GasFind: verificarea producției (${BASE})\n\n${md.join('\n')}\n`);
  }
  if (failed) {
    console.error(`\n${failed} verificări au picat.`);
    process.exit(1);
  }
  console.log('\nToate verificările au trecut.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
