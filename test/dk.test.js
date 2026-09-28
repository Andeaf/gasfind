import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as F from './fixtures.js';
import { setTransport, clearMemo } from '../lib/http.js';
import { handleTile, handleConfig } from '../lib/handler.js';
import { fuelKeys, parseOk, parseShell, parseQ8, parseOil, parseCircleK, parseGoon, parseUnox, _setSitesForTests } from '../lib/sources/dk.js';

const P = (o) => new URLSearchParams(o);
let restore = () => {};
afterEach(() => { restore(); clearMemo(); _setSitesForTests(undefined); });
const ok = (obj) => ({ status: 200, text: typeof obj === 'string' ? obj : JSON.stringify(obj), headers: {} });

test('Danemarca: numele produselor -> carburanții noștri (95 standard e E10; premium doar la e5)', () => {
  assert.deepEqual(fuelKeys('Blyfri 95'), ['e5', 'e10']);
  assert.deepEqual(fuelKeys('GoEasy 95 E10'), ['e5', 'e10']);
  assert.deepEqual(fuelKeys('GoEasy 95 Extra E5'), ['e5']);
  assert.deepEqual(fuelKeys('miles+ 95'), ['e5']);
  assert.deepEqual(fuelKeys('milesPLUS95'), ['e5']);
  assert.deepEqual(fuelKeys('UPGRADE 95'), ['e5']);
  assert.deepEqual(fuelKeys('Oktan 100'), ['e98']);
  assert.deepEqual(fuelKeys('V-Power 98'), ['e98']);
  assert.deepEqual(fuelKeys('Blyfri 100 E5'), ['e98']);
  assert.deepEqual(fuelKeys('Svovlfri Diesel'), ['diesel']);
  assert.deepEqual(fuelKeys('DieselB7'), ['diesel']);
  assert.deepEqual(fuelKeys('V-Power Diesel'), ['dp']);
  assert.deepEqual(fuelKeys('GoEasy Diesel Extra'), ['dp']);
  assert.deepEqual(fuelKeys('milesPLUS Di'), ['dp']);
  for (const n of ['AdBlue', 'HPC', 'Neste MY (HVO100)', 'BIO100_Diesel', 'Blyfri 92', '']) assert.equal(fuelKeys(n), null, n);
});

test('Danemarca: OK și Shell (coordonate numerice / text, ore locale)', () => {
  const [a] = parseOk(F.DK_OK);
  assert.equal(a.id, 'dk:ok1034');
  assert.equal(a.brand, 'OK');
  assert.equal(a.cur, 'DKK');
  assert.deepEqual(a.p, { diesel: 19.19, e5: 18.09, e10: 18.09, e98: 20.29 });
  assert.equal(a.u, '2026-09-27T20:24:52.559Z');
  assert.equal(a.city, '6100 Haderslev');
  const sh = parseShell(F.DK_SHELL);
  assert.equal(sh.length, 2);
  assert.equal(typeof sh[0].lat, 'number');
  assert.equal(sh[1].p.dp, 20.19, 'V-Power Diesel e motorină premium');
  assert.equal(sh[1].p.e98, 20.59, 'V-Power (benzină) e 98');
  assert.equal(sh[1].t.diesel, '2026-09-25T10:00:12.000Z', 'ora locală daneză -> UTC');
});

test('Danemarca: Q8/F24 și Circle K/INGO iau coordonatele din dk-sites; rândurile duplicate se elimină', () => {
  const q = parseQ8(F.DK_Q8, F.DK_SITES);
  assert.equal(q.length, 2, 'două stații din trei rânduri');
  const f24 = q.find((s) => s.id === 'dk:q88001');
  assert.equal(f24.brand, 'F24');
  assert.equal(f24.p.e5, 18.09, 'rândul cu data cea mai recentă câștigă');
  assert.deepEqual([f24.lat, f24.lng], F.DK_SITES['q8:8001']);
  assert.equal(f24.addr, 'Dronningemaen 34 Svendborg 5700');
  assert.equal(parseQ8(F.DK_Q8, {}).length, 0, 'fără coordonate, stația e sărită');
  const c = parseCircleK(F.DK_CK, F.DK_SITES);
  assert.equal(c.length, 2);
  assert.equal(c[0].brand, 'Circle K');
  assert.equal(c[0].name, 'Circle K Hasseris');
  assert.deepEqual(c[0].p, { diesel: 19.29, e5: 18.19, e10: 18.19, dp: 20.19 });
  assert.equal(c[1].brand, 'INGO');
  assert.equal(c[1].t.diesel, '2026-09-25T09:04:40.746Z');
});

test('Danemarca: OIL! unește răspunsurile per carburant și citește „lat N, lon E”', () => {
  const o = parseOil([F.DK_OIL_95, F.DK_OIL_DIESEL, F.DK_OIL_NOPRICE]);
  assert.equal(o.length, 2);
  assert.equal(o[0].lat, 55.2739);
  assert.equal(o[0].lng, 9.9074);
  assert.deepEqual(o[0].p, { diesel: 19.19, e5: 18.09, e10: 18.09 });
  assert.equal(o[0].addr, 'Nørre Allé 12');
  assert.equal(o[0].city, '5610 Assens');
  assert.equal(o[0].t.e5, '2026-09-25T09:00:00.000Z');
});

test("Danemarca: Go'on și Uno-X (formatul din documentații; inactive fără cheie)", () => {
  const [g] = parseGoon({ stations: [{ stationId: 'G1', brand: "Go'on", street: 'Vej', houseNumber: '1', postalCode: '8000', city: 'Aarhus', coordinates: { latitude: 56.15, longitude: 10.2 }, prices: [{ productName: 'Blyfri 95', price: 17.99, currency: 'DKK', lastUpdated: '2026-09-27T05:00:00+00:00' }, { productName: 'Diesel', price: 18.99, currency: 'DKK', lastUpdated: '2026-09-27T05:00:00+00:00' }] }, { stationId: 'G2', coordinates: null, prices: [] }] });
  assert.equal(g.id, 'dk:goG1');
  assert.deepEqual(g.p, { diesel: 18.99, e5: 17.99, e10: 17.99 });
  assert.equal(g.t.diesel, '2026-09-27T05:00:00.000Z');
  const [u] = parseUnox({ Data: [{ stationId: 'U1', stationName: 'Uno-X Odense', brand: 'Uno-X', address: { addressHouseNumber: 'Gade 5', postalCode: '5000', city: 'Odense', coordinates: { latitude: '55,39', longitude: '10,38' } }, products: [{ productName: 'Blyfri 95 E10', price: 17.89, currency: 'DKK', lastUpdated: '2026-09-27 05:21:13.210000' }] }] });
  assert.equal(u.lat, 55.39);
  assert.deepEqual(u.p, { e5: 17.89, e10: 17.89 });
  assert.equal(u.t.e5, '2026-09-27T05:21:13.000Z', 'ora e UTC');
});

test('Danemarca: o singură descărcare per companie pentru mai multe dale; o companie picată -> partial', async () => {
  _setSitesForTests(F.DK_SITES);
  const calls = [];
  restore = setTransport(async (url, opts) => {
    calls.push(url);
    if (/mobility-prices\.ok\.dk/.test(url)) return ok(F.DK_OK);
    if (/shellpumpepriser/.test(url)) return ok(F.DK_SHELL);
    if (/beta\.q8\.dk/.test(url)) return ok(F.DK_Q8);
    if (/Oil-FuelPrices/.test(url)) return ok(/95E10/.test(url) ? F.DK_OIL_95 : F.DK_OIL_DIESEL);
    if (/api\.circlek\.com/.test(url)) { assert.equal(opts.headers['X-App-Name'], 'PRICES'); return ok(F.DK_CK); }
    throw new Error('offline');
  });
  // dala Fyn (Svendborg/Assens): x=21, y=183 -> [10.5, 54.9, 11, 55.2]
  const a = await handleTile(P({ s: 'dk', x: 21, y: 183 }), {});
  assert.equal(a.status, 200);
  const body = JSON.parse(a.body);
  assert.equal(body.partial, false);
  assert.match(a.headers['Cache-Control'], /s-maxage=600/);
  assert.deepEqual(body.stations.map((s) => s.id).sort(), ['dk:q88001']);
  // altă dală: nicio cerere nouă (memo)
  const n = calls.length;
  const b = await handleTile(P({ s: 'dk', x: 19, y: 190 }), {}); // Aalborg: [9.5, 57, 10, 57.3]
  assert.equal(calls.length, n, 'toate companiile vin din memo');
  assert.ok(JSON.parse(b.body).stations.some((s) => s.id === 'dk:ck10103'));
  assert.equal(calls.filter((u) => /goon\.nu|unoxmobility/.test(u)).length, 0, "Go'on și Uno-X nu sunt chemate fără cheie");
  // o companie pică: rezultat parțial cu cache scurt
  clearMemo();
  restore();
  restore = setTransport(async (url) => {
    if (/mobility-prices\.ok\.dk/.test(url)) throw new Error('offline');
    if (/shellpumpepriser/.test(url)) return ok(F.DK_SHELL);
    if (/beta\.q8\.dk/.test(url)) return ok(F.DK_Q8);
    if (/Oil-FuelPrices/.test(url)) return ok(/95E10/.test(url) ? F.DK_OIL_95 : F.DK_OIL_DIESEL);
    if (/api\.circlek\.com/.test(url)) return ok(F.DK_CK);
    throw new Error('offline');
  });
  const c = await handleTile(P({ s: 'dk', x: 21, y: 183 }), {});
  assert.equal(JSON.parse(c.body).partial, true);
  assert.match(c.headers['Cache-Control'], /s-maxage=300/);
  // config: sursa apare, cu moneda DKK
  const cfg = JSON.parse((await handleConfig({})).body);
  const dk = cfg.sources.find((s) => s.id === 'dk');
  assert.equal(dk.cur, 'DKK');
  assert.equal(dk.complete, false);
});
