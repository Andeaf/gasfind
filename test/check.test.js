import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTile, checkRef, newestPriceTime, EU27, REF_SRC, PROBE } from '../scripts/check-prod.js';
import { ALL_SOURCES } from '../lib/registry.js';

const NOW = Date.parse('2026-10-12T08:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400e3).toISOString();

test('verificare: fiecare sursă (în afară de Germania) are un punct de verificare', () => {
  for (const s of ALL_SOURCES) if (s.id !== 'de') assert.ok(PROBE[s.id], s.id);
});

test('verificare: dală goală, date vechi, ora descărcării, copia OSM', () => {
  assert.deepEqual(checkTile({ id: 'fr' }, { stations: [] }, NOW), [false, 'nicio stație']);
  const fresh = { stations: [{ t: { diesel: daysAgo(9), e5: daysAgo(1) } }, { u: daysAgo(20) }] };
  assert.equal(newestPriceTime(fresh.stations), NOW - 86400e3);
  assert.equal(checkTile({ id: 'fr' }, fresh, NOW)[0], true);
  const [ok, msg] = checkTile({ id: 'fr' }, { stations: [{ t: { diesel: daysAgo(8) } }] }, NOW);
  assert.equal(ok, false);
  assert.match(msg, /date vechi \(8 zile\)/);
  // sursa dă doar ora descărcării (uf): nu se poate judeca vechimea, dar stațiile există
  assert.equal(checkTile({ id: 'at' }, { stations: [{ u: daysAgo(30), uf: true }] }, NOW)[0], true);
  assert.equal(checkTile({ id: 'osm' }, { stations: [{}], snapshot: daysAgo(3) }, NOW)[0], true);
  assert.equal(checkTile({ id: 'osm' }, { stations: [{}], snapshot: daysAgo(12) }, NOW)[0], false);
  assert.equal(checkTile({ id: 'osm' }, { stations: [{}] }, NOW)[0], false, 'fără copie = doar Overpass');
});

test('verificare: /api/ref cu UE-27 și maximele legale', () => {
  const countries = {};
  for (const cc of EU27) countries[cc] = { src: 'wob', date: daysAgo(7) };
  for (const [cc, src] of Object.entries(REF_SRC)) countries[cc] = { src, date: daysAgo(3) };
  assert.deepEqual(checkRef({ countries }, NOW), []);
  const broken = { ...countries, BE: { src: 'wob', date: daysAgo(7) }, LU: { src: 'lu', date: daysAgo(30) } };
  delete broken.RS;
  delete broken.ME;
  const p = checkRef({ countries: broken }, NOW);
  assert.equal(p.length, 3, p.join('; '));
  assert.ok(p.some((x) => /^BE: vine din „wob”/.test(x)));
  assert.ok(p.includes('RS: lipsește') && p.includes('ME: lipsește'));
  assert.ok(!p.some((x) => x.startsWith('LU')), 'LU are prag de 45 de zile');
  assert.equal(checkRef({ countries: { ...countries, HU: { src: 'wob', date: daysAgo(25) } } }, NOW).length, 1);
});
