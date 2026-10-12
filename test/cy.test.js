import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as F from './fixtures.js';
import { setTransport, clearMemo } from '../lib/http.js';
import { handleTile } from '../lib/handler.js';
import { parseTable, parseCoords, cookieHeader, merge } from '../lib/sources/cy.js';

const P = (o) => new URLSearchParams(o);
let restore = () => {};
afterEach(() => { restore(); clearMemo(); });

test('Cipru: tabelul observatorului -> stații cu coordonate (zecimale sau DMS), marcajul offline', () => {
  assert.deepEqual(parseCoords('35.1845138888889%2C33.3895'), { lat: 35.1845138888889, lng: 33.3895 });
  assert.deepEqual(parseCoords('34.92639%2C%2033.44032'), { lat: 34.92639, lng: 33.44032 });
  const dms = parseCoords('34%C2%B039%2713.5%22N%2032%C2%B058%2726.3%22E');
  assert.ok(Math.abs(dms.lat - 34.65375) < 1e-5 && Math.abs(dms.lng - 32.973972) < 1e-5, JSON.stringify(dms));
  assert.equal(parseCoords('nimic'), null);
  const rows = parseTable(F.CY_POST_95);
  assert.equal(rows.length, 4, 'rândul fără coordonate e sărit');
  assert.equal(rows[0].brand, 'ESSO');
  assert.equal(rows[0].name, 'I.G. MAKRIS ENTERPRISES LTD');
  assert.equal(rows[0].addr, 'Καντάρας 58 Τ.Κ 1037', 'telefonul e scos din adresă');
  assert.equal(rows[0].city, 'Καϊμακλί');
  assert.equal(rows[0].price, 1.717);
  assert.equal(rows[0].off, false);
  assert.equal(rows[2].off, true, 'isOffLine');
  assert.ok(rows.every((r) => /^[0-9a-f]{8}$/.test(r.id)), 'id stabil (hash)');
  assert.equal(cookieHeader({ 'set-cookie': F.CY_SET_COOKIE }), 'ASP.NET_SessionId_Efef=sesiune-de-test; __RequestVerificationToken=TOKEN-COOKIE-DE-TEST');
  assert.equal(cookieHeader({}), '');
  const st = merge([['e5', rows], ['diesel', parseTable(F.CY_POST_DIESEL)]], '2026-09-28T00:00:00.000Z');
  assert.equal(st.length, 4);
  assert.equal(st[0].id, 'cy:' + rows[0].id);
  assert.deepEqual(st[0].p, { e5: 1.717, diesel: 1.767 });
  assert.equal(st[0].uf, true);
  // titlul fișei: marcă · localitate; firma care operează stația e în x.op
  assert.equal(st[0].brand, 'ESSO');
  assert.equal(st[0].name, 'Καϊμακλί');
  assert.equal(st[0].city, 'Καϊμακλί');
  assert.equal(st[0].x.op, 'I.G. MAKRIS ENTERPRISES LTD');
  assert.equal(st[2].x.off, true);
  assert.ok(st[2].x.op);
});

test('Cipru: GET pentru cookie + token, câte un POST per carburant, o descărcare pentru toate dalele', async () => {
  const posts = [];
  restore = setTransport(async (url, opts) => {
    assert.match(url, /eforms\.eservices\.cyprus\.gov\.cy\/MCIT\/MCIT\/PetroleumPrices$/);
    if (!opts.method || opts.method === 'GET') return { status: 200, text: F.CY_GET, headers: { 'set-cookie': F.CY_SET_COOKIE } };
    assert.equal(opts.method, 'POST');
    assert.match(opts.headers.Cookie, /^ASP\.NET_SessionId_Efef=sesiune-de-test; __RequestVerificationToken=/);
    const body = new URLSearchParams(opts.body);
    assert.equal(body.get('__RequestVerificationToken'), 'TOKEN-DIN-FORMULAR');
    assert.equal(body.get('Entity.StationCityEnum'), 'All');
    posts.push(body.get('Entity.PetroleumType'));
    return { status: 200, text: body.get('Entity.PetroleumType') === '3' ? F.CY_POST_DIESEL : F.CY_POST_95, headers: {} };
  });
  // toată insula e o singură dală: x=5, y=5 -> [30, 30, 36, 36]
  const a = await handleTile(P({ s: 'cy', x: 5, y: 5 }), {});
  assert.equal(a.status, 200);
  const body = JSON.parse(a.body);
  const st = body.stations;
  assert.deepEqual(body.bbox, [30, 30, 36, 36]);
  assert.deepEqual([...posts].sort(), ['1', '2', '3'], 'câte un POST per carburant (sesiuni paralele)');
  assert.equal(st.length, 4, 'toate stațiile din fixture, inclusiv Pyrga și cea offline');
  assert.ok(st.some((s) => s.brand === 'ESSO' && s.p.e5 === 1.717 && s.p.diesel === 1.767));
  assert.ok(st.every((s) => s.cc === 'CY' && s.cur === 'EUR'));
  assert.ok(st.some((s) => s.x?.off === true), 'stația offline e marcată');
  assert.match(a.headers['Cache-Control'], /s-maxage=1800/);
  await handleTile(P({ s: 'cy', x: 5, y: 5 }), {});
  assert.equal(posts.length, 3, 'a doua cerere vine din memo');
  const far = await handleTile(P({ s: 'cy', x: 200, y: 200 }), {});
  assert.deepEqual(JSON.parse(far.body).stations, [], 'în afara acoperirii: gol, fără cereri');
});
