// Copia săptămânală a benzinăriilor OpenStreetMap (amenity=fuel), descărcată din Overpass țară cu țară
// (cu pauze între țări și reîncercări pe mai multe servere) și salvată pe grila sursei osm (dale de 0,25°):
//   lib/data/osm/index.json          data copiei, câte stații are fiecare țară și când a fost descărcată
//   lib/data/osm/tiles/<x>_<y>.json  stațiile unei dale (doar dalele cu stații)
// Rulată de .github/workflows/osm.yml (luni noaptea), care face commit pe main, deci se publică singură.
// Sursa osm citește aceste fișiere cu același filtru de țări ca înainte; Overpass rămâne doar rezervă.
//
// O țară care nu răspunde după toate reîncercările își păstrează stațiile din copia anterioară (și apare
// în index.failed, iar workflow-ul pică după commit, ca să afli prin email).
// Stațiile din țările cu sursă oficială completă mereu activă (FR, ES, IT...) aflate la peste 2 km de
// o țară fără sursă completă nu sunt salvate: filtrul de la rulare nu le-ar arăta în nicio configurație.
// Datele sunt © contribuitorii OpenStreetMap, sub ODbL 1.0 (https://www.openstreetmap.org/copyright).
//
// Rulare: node scripts/build-osm.js [--only=LU,LI] [--pause=15] [--budget=210 (minute)] [--out=<dosar>]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import COUNTRIES from '../lib/data/countries.js';
import osm, { parse } from '../lib/sources/osm.js';
import { makeOsmFilter } from '../lib/countries.js';
import { ALL_SOURCES } from '../lib/registry.js';
import { USER_AGENT } from '../lib/http.js';

const OUT = fileURLToPath(new URL('../lib/data/osm/', import.meta.url));
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const BACKOFF_S = [30, 90, 180, 300]; // pauzele dintre încercări (o încercare = toate serverele, pe rând)
// Serverele publice Overpass sunt des supraîncărcate (504). După bugetul total (minute), țările rămase
// nu mai sunt cerute: păstrează copia anterioară și apar în index.failed (workflow-ul are 300 de minute).
let deadline = Infinity;
// Rusia: conturul păstrat în lib/data/countries.js e doar regiunea Kaliningrad
const AREA = { RU: '["ISO3166-2"="RU-KGD"]' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Țările din conturul folosit de filtrul osm (fiecare o singură dată). */
export function countryList() {
  return [...new Set(COUNTRIES.map((c) => c.cc))].sort();
}

/** Țările unde o sursă oficială completă e activă în orice configurație (nu cere cheie). */
export function alwaysComplete(sources = ALL_SOURCES) {
  return new Set(sources.filter((s) => s.complete && s.cc && !s.enabled).map((s) => s.cc));
}

export function query(cc) {
  const area = AREA[cc] || `["ISO3166-1"="${cc}"]["boundary"="administrative"]`;
  return `[out:json][timeout:180];area${area}->.a;nwr["amenity"="fuel"](area.a);out center tags;`;
}

async function download(cc) {
  const body = 'data=' + encodeURIComponent(query(cc));
  let last = new Error('bugetul de timp s-a terminat');
  for (let attempt = 0; attempt <= BACKOFF_S.length; attempt++) {
    for (const url of ENDPOINTS) {
      if (Date.now() > deadline) throw last;
      try {
        const res = await fetch(url, {
          method: 'POST', body, signal: AbortSignal.timeout(210e3),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
        const json = JSON.parse(text);
        if (!Array.isArray(json.elements)) throw new Error('răspuns fără „elements”');
        if (json.remark && /error|timed out|out of memory/i.test(json.remark)) throw new Error(`Overpass: ${json.remark.slice(0, 100)}`);
        return json;
      } catch (e) {
        last = e;
        console.warn(`  ${cc} @ ${new URL(url).hostname}: ${e.message}`);
      }
    }
    if (attempt < BACKOFF_S.length && Date.now() + BACKOFF_S[attempt] * 1000 < deadline) await sleep(BACKOFF_S[attempt] * 1000);
  }
  throw last;
}

/** Stațiile din copia existentă (toate dalele), sau [] dacă nu există. */
export function readSnapshot(dir = OUT) {
  const index = existsSync(join(dir, 'index.json')) ? JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) : null;
  const stations = [];
  if (existsSync(join(dir, 'tiles'))) {
    for (const f of readdirSync(join(dir, 'tiles'))) if (f.endsWith('.json')) stations.push(...JSON.parse(readFileSync(join(dir, 'tiles', f), 'utf8')));
  }
  return { index, stations };
}

/**
 * Stațiile descărcate (pe țară) -> dale. Fiecare stație primește cc = țara în care a fost găsită
 * (granița reală din OSM); o stație găsită în două țări (la graniță) rămâne la prima.
 * `keep` e filtrul de țări (makeOsmFilter) pentru țările complete în orice configurație.
 */
export function buildTiles(byCountry, keep, { tile = osm.tile, coverage = osm.coverage[0] } = {}) {
  const seen = new Set();
  const tiles = new Map();
  for (const [cc, list] of byCountry) {
    for (const st of list) {
      if (seen.has(st.id)) continue;
      seen.add(st.id);
      const [w, s, e, n] = coverage;
      if (st.lng < w || st.lng >= e || st.lat < s || st.lat >= n) continue;
      if (!keep(st.lat, st.lng).keep) continue;
      const key = `${Math.floor(st.lng / tile[0])}_${Math.floor(st.lat / tile[1])}`;
      (tiles.get(key) || tiles.set(key, []).get(key)).push({ ...st, cc });
    }
  }
  for (const list of tiles.values()) list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return tiles;
}

function writeSnapshot(tiles, index, dir = OUT) {
  mkdirSync(join(dir, 'tiles'), { recursive: true });
  const names = new Set([...tiles.keys()].map((k) => `${k}.json`));
  for (const f of readdirSync(join(dir, 'tiles'))) if (!names.has(f)) rmSync(join(dir, 'tiles', f));
  for (const [key, list] of tiles) writeFileSync(join(dir, 'tiles', `${key}.json`), JSON.stringify(list) + '\n');
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 1) + '\n');
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
  const pause = Number(args.pause ?? 15) * 1000;
  deadline = Date.now() + Number(args.budget ?? 210) * 60e3;
  const all = countryList();
  const only = args.only ? new Set(args.only.split(',').map((s) => s.trim().toUpperCase())) : null;
  const dir = args.out || OUT;
  const old = readSnapshot(dir);
  const oldByCc = new Map();
  for (const st of old.stations) (oldByCc.get(st.cc) || oldByCc.set(st.cc, []).get(st.cc)).push(st);

  const now = new Date().toISOString();
  const byCountry = new Map();
  const countries = {};
  const failed = [];
  for (const [i, cc] of all.entries()) {
    const prev = old.index?.countries?.[cc];
    if (only && !only.has(cc)) {
      // țară nedescărcată de data asta: rămâne ce era
      byCountry.set(cc, oldByCc.get(cc) || []);
      if (prev) countries[cc] = prev;
      continue;
    }
    const t0 = Date.now();
    try {
      const list = parse(await download(cc));
      // 0 stații într-o țară care avea stații = aproape sigur o eroare a serverului, nu realitatea
      if (!list.length && prev?.n > 0) throw new Error('0 stații (copia anterioară avea ' + prev.n + ')');
      byCountry.set(cc, list);
      countries[cc] = { n: list.length, date: now };
      console.log(`${cc}: ${list.length} stații (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } catch (e) {
      failed.push(cc);
      byCountry.set(cc, oldByCc.get(cc) || []);
      if (prev) countries[cc] = prev;
      console.error(`${cc}: EȘUAT (${e.message}); păstrez copia anterioară${prev ? ` din ${prev.date.slice(0, 10)}` : ' (nu există)'}`);
    }
    if (i < all.length - 1 && (!only || only.has(all[i + 1]))) await sleep(pause);
  }

  const keep = await makeOsmFilter(alwaysComplete());
  const tiles = buildTiles(byCountry, keep);
  let n = 0;
  for (const list of tiles.values()) n += list.length;
  const index = {
    generated: now,
    license: 'ODbL 1.0 – © contribuitorii OpenStreetMap (https://www.openstreetmap.org/copyright)',
    tile: osm.tile,
    tiles: tiles.size,
    stations: n,
    failed,
    countries,
  };
  writeSnapshot(tiles, index, dir);
  console.log(`gata: ${n} stații în ${tiles.size} dale${failed.length ? `; eșuate: ${failed.join(', ')}` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
