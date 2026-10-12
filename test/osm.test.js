import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as F from './fixtures.js';
import { setTransport, clearMemo } from '../lib/http.js';
import { handleTile } from '../lib/handler.js';
import { parse, setDataDir } from '../lib/sources/osm.js';
import { buildTiles, alwaysComplete, countryList, query } from '../scripts/build-osm.js';

const P = (o) => new URLSearchParams(o);
let restore = () => {};
afterEach(() => { restore(); clearMemo(); setDataDir(mkdtempSync(join(tmpdir(), 'gf-osm-'))); });

function snapshot(index, tiles) {
  const dir = mkdtempSync(join(tmpdir(), 'gf-osm-'));
  mkdirSync(join(dir, 'tiles'));
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index));
  for (const [key, list] of Object.entries(tiles)) writeFileSync(join(dir, 'tiles', `${key}.json`), JSON.stringify(list));
  setDataDir(dir);
}

function mock(fn) {
  const calls = [];
  restore = setTransport(async (url, opts) => { calls.push(url); return fn(url, opts); });
  return calls;
}

test('OSM: dala vine din copia săptămânală, fără Overpass; data copiei e în răspuns', async () => {
  const stations = parse(F.OSM_JSON).map((s) => ({ ...s, cc: 'RO' }));
  snapshot({ generated: '2026-10-12T02:00:00.000Z', countries: { RO: { n: 2, date: '2026-10-12T02:00:00.000Z' }, UA: { n: 0, date: '2026-10-12T02:00:00.000Z' } } }, { '104_190': stations });
  const calls = mock(() => { throw new Error('Overpass nu trebuia apelat'); });
  const out = await handleTile(P({ s: 'osm', x: 104, y: 190 }), {});
  assert.equal(out.status, 200);
  const body = JSON.parse(out.body);
  assert.equal(calls.length, 0);
  assert.equal(body.snapshot, '2026-10-12T02:00:00.000Z');
  assert.equal(body.stations.length, 2);
  assert.equal(body.stations[0].cc, 'RO');
  assert.match(out.headers['Cache-Control'], /s-maxage=1209600/);
  // dală fără fișier, dar acoperită de copie: goală, tot fără Overpass
  const empty = JSON.parse((await handleTile(P({ s: 'osm', x: 105, y: 190 }), {})).body);
  assert.deepEqual(empty.stations, []);
  assert.equal(calls.length, 0);
});

test('OSM: țară lipsă din copie sau copie lipsă -> Overpass (rezerva)', async () => {
  snapshot({ generated: '2026-10-12T02:00:00.000Z', countries: { RO: { n: 2, date: '2026-10-12T02:00:00.000Z' } } }, {});
  const calls = mock(() => ({ status: 200, text: JSON.stringify(F.OSM_JSON), headers: {} }));
  // Budapesta: Ungaria nu e în copie
  const bp = JSON.parse((await handleTile(P({ s: 'osm', x: 76, y: 190 }), {})).body);
  assert.equal(calls.length, 1);
  assert.equal(bp.snapshot, undefined);
  setDataDir(mkdtempSync(join(tmpdir(), 'gf-osm-'))); // fără index.json
  const sv = JSON.parse((await handleTile(P({ s: 'osm', x: 104, y: 190 }), {})).body);
  assert.equal(calls.length, 2);
  assert.equal(sv.stations.length, 2);
});

test('OSM, generatorul: dale de 0,25°, țara interogării, dubluri la graniță, filtrul de țări', () => {
  const a = { id: 'osm:n1', lat: 47.64, lng: 26.21, p: {} };
  const b = { id: 'osm:n2', lat: 47.51, lng: 19.04, p: {} };
  const c = { id: 'osm:n3', lat: 48.85, lng: 2.35, p: {} }; // Paris: departe de orice țară fără sursă completă
  const out = { id: 'osm:n4', lat: 10, lng: 10, p: {} }; // în afara acoperirii
  const keep = (lat) => ({ keep: lat !== 48.85 });
  const tiles = buildTiles(new Map([['RO', [a, out]], ['HU', [b, a]], ['FR', [c]]]), keep);
  assert.deepEqual([...tiles.keys()].sort(), ['104_190', '76_190']);
  assert.deepEqual(tiles.get('104_190'), [{ ...a, cc: 'RO' }], 'stația găsită în două țări rămâne la prima');
  assert.equal(tiles.get('76_190')[0].cc, 'HU');
  const ac = alwaysComplete();
  for (const cc of ['FR', 'ES', 'PT', 'IT', 'SI', 'HR', 'MD', 'CY']) assert.ok(ac.has(cc), cc);
  for (const cc of ['DE', 'AT', 'RO', 'DK']) assert.ok(!ac.has(cc), `${cc} nu e complet în orice configurație`);
  assert.ok(countryList().includes('HU') && countryList().includes('XK'));
  assert.match(query('HU'), /area\["ISO3166-1"="HU"\]/);
  assert.match(query('RU'), /area\["ISO3166-2"="RU-KGD"\]/, 'din Rusia doar Kaliningradul');
});
