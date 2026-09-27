import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from './fixtures.js';
import { parse as parseFR } from '../lib/sources/fr.js';
import { parse as parseES, provincesFor } from '../lib/sources/es.js';
import { parse as parsePT, districtsFor } from '../lib/sources/pt.js';
import { parse as parseIT } from '../lib/sources/it.js';
import { parseV4 } from '../lib/sources/de.js';
import { parse as parseAT } from '../lib/sources/at.js';
import { parse as parseSI } from '../lib/sources/si.js';
import { parse as parseHR } from '../lib/sources/hr.js';
import { parse as parseMD } from '../lib/sources/md.js';
import { parse as parseRO } from '../lib/sources/ro.js';
import { parse as parseOSM } from '../lib/sources/osm.js';

test('Franța: prețuri, ore în fusul Franței, carburanți indisponibili, nume din OSM', () => {
  const [a, b] = parseFR(F.FR_ROWS, { 92230008: ['TotalEnergies', 'Relais Gennevilliers'] });
  assert.equal(a.id, 'fr:92230008');
  assert.equal(a.brand, 'TotalEnergies');
  assert.equal(a.name, 'Relais Gennevilliers');
  assert.deepEqual(a.p, { diesel: 2.449, e5: 2.279, e10: 2.249, e98: 2.319 });
  assert.equal(a.t.diesel, '2026-09-18T11:42:54.000Z'); // 13:42 ora Parisului (CEST) = 11:42 UTC
  assert.equal(a.city, '92230 Gennevilliers');
  assert.equal(b.p.e5, undefined, 'SP95 e în lista de indisponibile');
  assert.equal(b.t.diesel, '2026-01-10T11:00:00.000Z'); // iarna: UTC+1
  assert.deepEqual(b.x, { hw: true, h24: true });
});

test('Spania: virgulă zecimală, fără stațiile cu vânzare restricționată', () => {
  const list = parseES(F.ES_JSON);
  assert.equal(list.length, 1);
  const s = list[0];
  assert.equal(s.id, 'es:6230');
  assert.equal(s.brand, 'REPSOL');
  assert.equal(s.lat, 41.805583);
  assert.equal(s.lng, -2.786306);
  assert.deepEqual(s.p, { diesel: 2.025, e5: 2.045, e98: 2.205, dp: 2.075 });
  assert.equal(s.u, '2026-09-26T21:59:04.000Z');
  assert.ok(provincesFor([-2.9, 41.7, -2.7, 41.9]).includes('42'));
});

test('Portugalia: rânduri grupate pe stație, 98 simplu preferat', () => {
  const list = parsePT(F.PT_JSON);
  assert.equal(list.length, 1, 'stația cu doar motorină agricolă nu apare');
  const s = list[0];
  assert.equal(s.id, 'pt:67360');
  assert.deepEqual(s.p, { diesel: 1.939, e5: 1.849, e98: 1.999 });
  assert.equal(s.t.diesel, '2026-09-22T07:45:00.000Z'); // Lisabona vara = UTC+1
  assert.ok(districtsFor([-6.9, 40.5, -6.8, 40.7]).includes('9'));
});

test('Italia: preț self-service preferat, benzină 100 ca 98+, HVO ignorat', () => {
  const [a, b] = parseIT(F.IT_JSON);
  assert.equal(a.brand, 'Tamoil');
  assert.deepEqual(a.p, { e5: 2.279, diesel: 2.129 });
  assert.equal(a.u, '2026-09-26T20:05:27.000Z');
  assert.deepEqual(a.x, { self: true });
  assert.equal(b.brand, undefined);
  assert.equal(b.name, 'Pompă independentă');
  assert.deepEqual(b.p, { e5: 2.139, diesel: 2.409, e98: 2.289, lpg: 0.899 });
});

test('Germania: API v4 cu ora ultimei schimbări de preț', () => {
  const [s] = parseV4(F.DE_V4);
  assert.equal(s.id, 'de:1c4f126b-1f3c-4b38-9692-05c400ea8e61');
  assert.deepEqual(s.p, { diesel: 2.389, e5: 2.309, e10: 2.249 });
  assert.equal(s.t.diesel, '2026-09-26T18:50:18.000Z');
  assert.equal(s.city, '10407 Berlin');
  assert.equal(s.open, true);
});

test('Austria: doar stațiile ieftine au preț; răspuns HTML = eroare', () => {
  const list = parseAT(F.AT_LIST, 'diesel');
  assert.equal(list.length, 2);
  assert.deepEqual(list[0].p, { diesel: 1.699 });
  assert.deepEqual(list[1].p, {});
  assert.throws(() => parseAT('<html>Wartung</html>', 'diesel'));
});

test('Slovenia: chei de preț, marcă scurtă', () => {
  const [s] = parseSI(F.SI_RESULTS, F.SI_FRANCHISES, '2026-09-27T00:00:00.000Z');
  assert.equal(s.brand, 'Petrol');
  assert.deepEqual(s.p, { e5: 1.748, diesel: 2.012, e98: 2.101, lpg: 0.976 });
  assert.equal(s.uf, true);
});

test('Croația: coordonate inversate corectate, preț minim pe tip', () => {
  const [s] = parseHR(F.HR_JSON);
  assert.equal(s.lat, 42.798694);
  assert.equal(s.lng, 17.850944);
  assert.equal(s.brand, 'Tifon');
  assert.deepEqual(s.p, { e5: 1.64, e98: 2.1, diesel: 1.72, lpg: 0.86 });
});

test('Moldova: Web Mercator -> grade, stații inactive excluse, MDL', () => {
  const list = parseMD(F.MD_LIST);
  assert.equal(list.length, 1);
  const s = list[0];
  assert.ok(Math.abs(s.lat - 48.261) < 0.01, `lat ${s.lat}`);
  assert.ok(Math.abs(s.lng - 26.684) < 0.01, `lng ${s.lng}`);
  assert.equal(s.cur, 'MDL');
  assert.deepEqual(s.p, { diesel: 36.82, e5: 34.28 });
});

test('România: stații + prețuri din mai multe cereri, ora României', () => {
  const list = parseRO([F.RO_DIESEL, F.RO_PETROL]);
  assert.equal(list.length, 2);
  const petrom = list.find((s) => s.id === 'ro:PETROM:R1091');
  assert.equal(petrom.brand, 'Petrom');
  assert.equal(petrom.cur, 'RON');
  assert.deepEqual(petrom.p, { diesel: 10.91, e5: 9.79 });
  assert.equal(petrom.u, '2026-09-24T22:05:00.000Z'); // 25/09 01:05 ora României (UTC+3)
  const rompetrol = list.find((s) => s.id === 'ro:ROMPETROL:041SC1');
  assert.deepEqual(rompetrol.p, { diesel: 10.89 });
});

test('OpenStreetMap: noduri și contururi, fără stațiile private', () => {
  const list = parseOSM(F.OSM_JSON);
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'osm:n101');
  assert.deepEqual(list[0].x, { fuels: ['diesel', 'lpg'] });
  assert.equal(list[1].brand, 'Gulf');
  assert.equal(list[1].addr, 'Calea Unirii 5');
  assert.equal(list[1].cur, undefined);
});
