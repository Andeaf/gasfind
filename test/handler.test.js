import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as F from './fixtures.js';
import { setTransport, clearMemo } from '../lib/http.js';
import { handleTile, handleConfig, handleDetail } from '../lib/handler.js';
import { splitBbox, bboxCenter } from '../lib/geo.js';

const P = (o) => new URLSearchParams(o);
let restore = () => {};
afterEach(() => { restore(); clearMemo(); });

function mock(fn) {
  const calls = [];
  restore = setTransport(async (url, opts) => { calls.push({ url, opts }); return fn(url, opts); });
  return calls;
}
const ok = (obj) => ({ status: 200, text: typeof obj === 'string' ? obj : JSON.stringify(obj), headers: {} });

test('config: sursele active; Germania doar cu cheie', async () => {
  mock(() => { throw new Error('offline'); });
  const a = JSON.parse((await handleConfig({})).body);
  assert.ok(!a.sources.some((s) => s.id === 'de'));
  assert.equal(a.deMissingKey, true);
  assert.equal(a.fx.rates.RON > 3, true);
  const b = JSON.parse((await handleConfig({ TANKERKOENIG_API_KEY: 'k' })).body);
  assert.ok(b.sources.some((s) => s.id === 'de'));
});

test('tile: validare parametri', async () => {
  assert.equal((await handleTile(P({ s: 'xx', x: 1, y: 1 }), {})).status, 404);
  assert.equal((await handleTile(P({ s: 'fr', x: 'a', y: 1 }), {})).status, 400);
  assert.equal((await handleTile(P({ s: 'de', x: 1, y: 1 }), {})).status, 404, 'fără cheie, DE e inactiv');
  const far = await handleTile(P({ s: 'fr', x: 300, y: 300 }), {});
  assert.equal(far.status, 200);
  assert.deepEqual(JSON.parse(far.body).stations, []);
});

test('tile Franța: cerere in_bbox, filtrare și cache CDN', async () => {
  const calls = mock((url) => {
    assert.match(decodeURIComponent(url), /in_bbox\(geom,48\.72,2\.1,48\.96,2\.4\)/);
    return ok(F.FR_ROWS);
  });
  const out = await handleTile(P({ s: 'fr', x: 7, y: 203 }), {});
  assert.equal(out.status, 200);
  assert.match(out.headers['Cache-Control'], /s-maxage=600/);
  const body = JSON.parse(out.body);
  assert.equal(calls.length, 1);
  assert.equal(body.stations.length, 2);
  assert.deepEqual(body.bbox, [2.1, 48.72, 2.4, 48.96]);
});

test('tile România: sondaj cu motorină, apoi restul carburanților doar unde sunt stații', async () => {
  // dala 0,24×0,18 care conține Suceava; doar cercul cel mai apropiat de oraș are stații
  const x = Math.floor(26.24 / 0.24), y = Math.floor(47.64 / 0.18);
  const bbox = [x * 0.24, y * 0.18, (x + 1) * 0.24, (y + 1) * 0.18];
  const centers = splitBbox(bbox, 3, 3).map(bboxCenter);
  const pop = centers.reduce((a, c) => (Math.hypot(c.lat - 47.64, c.lng - 26.24) < Math.hypot(a.lat - 47.64, a.lng - 26.24) ? c : a));
  const calls = mock((url, opts) => {
    assert.ok(opts.ca && opts.ca.length === 1, 'folosește CA-ul Sectigo suplimentar');
    const u = new URL(url);
    const lat = +u.searchParams.get('lat'), lon = +u.searchParams.get('lon');
    const prod = u.searchParams.get('CSVGasCatalogProductIds');
    if (Math.abs(lat - pop.lat) > 1e-4 || Math.abs(lon - pop.lng) > 1e-4) return ok('{ }');
    if (prod === '21') return ok(F.RO_DIESEL);
    if (prod === '11') return ok(F.RO_PETROL);
    return { status: 500, text: '{"Message":"An error has occurred."}', headers: {} };
  });
  const out = await handleTile(P({ s: 'ro', x, y }), {});
  const body = JSON.parse(out.body);
  assert.equal(out.status, 200, body.error);
  assert.match(out.headers['Cache-Control'], /s-maxage=10800/);
  const probes = calls.filter((c) => c.url.includes('CSVGasCatalogProductIds=21')).length;
  assert.equal(probes, 9, '9 cercuri de sondaj');
  assert.equal(calls.length, 9 + 4, 'restul carburanților doar pentru cercul cu stații');
  const petrom = body.stations.find((s) => s.id === 'ro:PETROM:R1091');
  assert.deepEqual(petrom.p, { diesel: 10.91, e5: 9.79 });
});

test('tile România: zone dense (50 rezultate) se subdivid', async () => {
  const many = { Stations: [], Products: [] };
  for (let i = 0; i < 50; i++) {
    many.Stations.push({ id: `P${i}`, name: `S${i}`, updatedate: '26/09/2026 00:16', network: { id: 'LUKOIL' }, addr: { location: { Lat: 44.43 + i * 0.0001, Lon: 26.10 } } });
  }
  const buffers = [];
  mock((url) => {
    const u = new URL(url);
    buffers.push(+u.searchParams.get('buffer'));
    return ok(u.searchParams.get('CSVGasCatalogProductIds') === '21' && u.searchParams.get('buffer') === '5000' ? many : '{ }');
  });
  const x = Math.floor(26.10 / 0.24), y = Math.floor(44.43 / 0.18);
  const out = await handleTile(P({ s: 'ro', x, y }), {});
  assert.equal(out.status, 200);
  assert.ok(buffers.includes(2500), 'a cerut și cu rază 2500 m');
});

test('tile Germania: limită de cereri -> 503 cu Retry-After, fără cache', async () => {
  mock(() => ({ status: 503, text: 'rate limited', headers: {} }));
  const out = await handleTile(P({ s: 'de', x: 29, y: 175 }), { TANKERKOENIG_API_KEY: 'k' });
  assert.equal(out.status, 503);
  assert.equal(out.headers['Retry-After'], '60');
  assert.equal(out.headers['Cache-Control'], 'no-store');
});

test('tile Italia: 4 cereri POST pe zonă, rază ≤ 10 km', async () => {
  const radii = [];
  mock((url, opts) => {
    assert.equal(opts.method, 'POST');
    const b = JSON.parse(opts.body);
    radii.push(b.radius);
    assert.equal(b.points.length, 1);
    return ok(F.IT_JSON);
  });
  const x = Math.floor(9.2 / 0.3), y = Math.floor(45.45 / 0.24);
  const out = await handleTile(P({ s: 'it', x, y }), {});
  assert.equal(out.status, 200);
  assert.equal(radii.length, 4);
  assert.ok(radii.every((r) => r <= 10));
  assert.equal(JSON.parse(out.body).stations.length, 2, 'deduplicate după id');
});

test('tile OSM: nicio cerere Overpass pentru dale din țări complete', async () => {
  const calls = mock(() => ok(F.OSM_JSON));
  const paris = await handleTile(P({ s: 'osm', x: Math.floor(2.3 / 0.25), y: Math.floor(48.8 / 0.25) }), {});
  assert.equal(paris.status, 200);
  assert.equal(JSON.parse(paris.body).stations.length, 0);
  assert.equal(calls.length, 0);
  const suceava = await handleTile(P({ s: 'osm', x: 104, y: 190 }), {});
  const body = JSON.parse(suceava.body);
  assert.equal(calls.length, 1);
  assert.equal(body.stations.length, 2);
  assert.equal(body.stations[0].cc, 'RO');
  assert.match(suceava.headers['Cache-Control'], /s-maxage=1209600/);
});

test('eroare la sursă -> 502 fără cache', async () => {
  mock(() => { throw new Error('ECONNRESET'); });
  const out = await handleTile(P({ s: 'hr', x: 30, y: 90 }), {});
  assert.equal(out.status, 502);
  assert.equal(out.headers['Cache-Control'], 'no-store');
});

test('detalii Italia', async () => {
  mock(() => ok({ id: 47183, name: '8212', nomeImpianto: '8212', address: 'ROMAGNA 0 - 20133 MILANO (MI)', brand: 'Tamoil', company: 'T.D.M. S.R.L.' }));
  const out = await handleDetail(P({ s: 'it', id: '47183' }), {});
  assert.deepEqual(JSON.parse(out.body), { addr: 'ROMAGNA 0 - 20133 MILANO (MI)', company: 'T.D.M. S.R.L.' });
  assert.equal((await handleDetail(P({ s: 'fr', id: '1' }), {})).status, 404);
  assert.equal((await handleDetail(P({ s: 'it', id: '../x' }), {})).status, 400);
});

test('Overpass: dacă primul server tace, răspunde următorul (cereri eșalonate)', async () => {
  const { overpass } = await import('../lib/sources/osm.js');
  const calls = [];
  mock((url) => {
    calls.push(url);
    if (url.includes('slow')) return new Promise(() => {}); // nu răspunde niciodată
    return ok(F.OSM_JSON);
  });
  const t0 = Date.now();
  const json = await overpass([26, 47.5, 26.25, 47.75], ['https://slow/api', 'https://fast/api'], 60, 2000);
  assert.equal(json.elements.length, 3);
  assert.deepEqual(calls, ['https://slow/api', 'https://fast/api']);
  assert.ok(Date.now() - t0 < 1000);
});

test('Overpass: eroare rapidă -> următorul server pornește imediat; toate picate -> eroare', async () => {
  const { overpass } = await import('../lib/sources/osm.js');
  mock((url) => (url.includes('bad') ? { status: 429, text: 'Too Many Requests', headers: {} } : ok({ elements: [], remark: 'runtime error: Query timed out' })));
  await assert.rejects(overpass([26, 47.5, 26.25, 47.75], ['https://bad/api', 'https://remark/api'], 10000, 2000), /Overpass: runtime error/);
  const calls = mock((url) => (url.includes('bad') ? { status: 504, text: 'Gateway Timeout', headers: {} } : ok(F.OSM_JSON)));
  const t0 = Date.now();
  const json = await overpass([26, 47.5, 26.25, 47.75], ['https://bad/api', 'https://good/api'], 10000, 2000);
  assert.equal(json.elements.length, 3);
  assert.equal(calls.length, 2);
  assert.ok(Date.now() - t0 < 1000, 'nu a așteptat eșalonarea de 10 s');
});
