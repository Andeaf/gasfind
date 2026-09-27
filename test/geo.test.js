import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileBbox, tilesForBbox, bboxHalfDiagonalKm, splitBbox, haversineKm, parseNum } from '../lib/geo.js';
import { localIsoToUtc, dmyToUtc, isoToUtc } from '../lib/time.js';
import { countryAt, makeOsmFilter, tileTouchesIncomplete } from '../lib/countries.js';

test('dale: bbox și acoperire', () => {
  assert.deepEqual(tileBbox([0.25, 0.25], 104, 190), [26, 47.5, 26.25, 47.75]);
  const tiles = tilesForBbox([0.25, 0.25], [26.1, 47.6, 26.4, 47.7]);
  assert.deepEqual(tiles, [[104, 190], [105, 190]]);
  assert.equal(tilesForBbox([0.5, 0.5], [-3.9, 40.2, -3.6, 40.6]).length, 2);
});

test('mărimile dalelor respectă limitele API-urilor', () => {
  // Italia: sub-dreptunghi 0,15×0,12 -> < 10 km chiar și în sud
  for (const lat of [36.6, 41, 47]) {
    const sub = splitBbox([12, lat, 12.3, lat + 0.24], 2, 2)[0];
    assert.ok(bboxHalfDiagonalKm(sub) < 10, `IT ${lat}`);
  }
  // Germania: dală 0,45×0,3 -> < 25 km
  assert.ok(bboxHalfDiagonalKm([9, 47.1, 9.45, 47.4]) < 25);
  // România: sub-dreptunghi 0,08×0,06 -> < 5 km
  assert.ok(bboxHalfDiagonalKm(splitBbox([26.16, 43.56, 26.4, 43.74], 3, 3)[0]) < 5);
});

test('distanțe și numere', () => {
  assert.ok(Math.abs(haversineKm(47.6514, 26.2556, 44.4268, 26.1025) - 358.7) < 2);
  assert.equal(parseNum('1,939 €'), 1.939);
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('2,025'), 2.025);
});

test('ore locale -> UTC', () => {
  assert.equal(localIsoToUtc('2026-09-18T13:42:54+00:00', 'Europe/Paris'), '2026-09-18T11:42:54.000Z');
  assert.equal(localIsoToUtc('2026-12-18 13:42', 'Europe/Paris'), '2026-12-18T12:42:00.000Z');
  assert.equal(dmyToUtc('26/09/2026 00:16 ', 'Europe/Bucharest'), '2026-09-25T21:16:00.000Z');
  assert.equal(dmyToUtc('26/09/2026 23:59:04', 'Europe/Madrid'), '2026-09-26T21:59:04.000Z');
  assert.equal(isoToUtc('2026-09-26T20:29:52+02'), '2026-09-26T18:29:52.000Z');
  assert.equal(isoToUtc('2026-09-26T22:05:27+02:00'), '2026-09-26T20:05:27.000Z');
  assert.equal(isoToUtc('nimic'), null);
});

test('țara unui punct', async () => {
  assert.equal(await countryAt(47.6514, 26.2556), 'RO'); // Suceava
  assert.equal(await countryAt(48.8566, 2.3522), 'FR'); // Paris
  assert.equal(await countryAt(47.0105, 28.8638), 'MD'); // Chișinău
  assert.equal(await countryAt(48.2082, 16.3738), 'AT'); // Viena
  assert.equal(await countryAt(40.4168, -3.7038), 'ES'); // Madrid
  assert.equal(await countryAt(38.7223, -9.1393), 'PT'); // Lisabona
  assert.equal(await countryAt(52.52, 13.405), 'DE'); // Berlin
  assert.equal(await countryAt(47.4979, 19.0402), 'HU'); // Budapesta
  assert.equal(await countryAt(43.5, 5.0), 'FR'); // Provence
  assert.equal(await countryAt(43.0, 6.0), null); // Marea Mediterană
});

test('filtrul OSM: ascunde stațiile din țări complete, păstrează granițele', async () => {
  const complete = new Set(['FR', 'ES', 'PT', 'IT', 'DE', 'SI', 'HR', 'MD']);
  const keep = await makeOsmFilter(complete);
  assert.equal(keep(47.0, 2.0).keep, false); // centrul Franței
  assert.equal(keep(47.6514, 26.2556).keep, true); // Suceava
  assert.equal(keep(50.7835, 3.1234).keep, true); // Halluin, lângă granița cu Belgia
  assert.equal(keep(47.4979, 19.0402).keep, true); // Budapesta
  // tile-uri
  assert.equal(await tileTouchesIncomplete([2.25, 48.75, 2.5, 49.0], complete), false); // Paris
  assert.equal(await tileTouchesIncomplete([26.0, 47.5, 26.25, 47.75], complete), true); // Suceava
  assert.equal(await tileTouchesIncomplete([7.6, 48.4, 7.85, 48.65], complete), false); // Strasbourg/Kehl (FR+DE)
  assert.equal(await tileTouchesIncomplete([7.6, 48.4, 7.85, 48.65], new Set(['FR'])), true); // fără cheia DE
  assert.equal(await tileTouchesIncomplete([3.0, 50.7, 3.25, 50.95], complete), true); // Lille/Belgia
});
