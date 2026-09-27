// Generează lib/data/countries.json: poligoanele simplificate ale țărilor europene
// (din Natural Earth 1:10m, prin pachetul npm world-atlas, domeniu public).
// Serverul le folosește ca să știe în ce țară cade o benzinărie OpenStreetMap.
// Rulare: node scripts/build-countries.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-10m.json', import.meta.url)));
const fc = feature(topo, topo.objects.countries);

const ISO = {
  '008': 'AL', '020': 'AD', '040': 'AT', '112': 'BY', '056': 'BE', '070': 'BA', '100': 'BG', '191': 'HR',
  '196': 'CY', '203': 'CZ', '208': 'DK', '233': 'EE', '246': 'FI', '250': 'FR', '276': 'DE', '300': 'GR',
  '348': 'HU', '352': 'IS', '372': 'IE', '380': 'IT', '428': 'LV', '438': 'LI', '440': 'LT', '442': 'LU',
  '470': 'MT', '498': 'MD', '492': 'MC', '499': 'ME', '528': 'NL', '807': 'MK', '578': 'NO', '616': 'PL',
  '620': 'PT', '642': 'RO', '643': 'RU', '674': 'SM', '688': 'RS', '703': 'SK', '705': 'SI', '724': 'ES',
  '752': 'SE', '756': 'CH', '792': 'TR', '804': 'UA', '826': 'GB', '336': 'VA', '292': 'GI', '234': 'FO',
  '831': 'GG', '832': 'JE', '833': 'IM', '248': 'AX',
};
const BY_NAME = { 'Kosovo': 'XK', 'N. Cyprus': 'CY', 'Cyprus U.N. Buffer Zone': 'CY' };

// Poligoanele servesc la a decide dacă o benzinărie OSM cade într-o țară acoperită deja
// de o sursă oficială completă (atunci n-o mai afișăm dublat) sau lângă granița ei.
// Țările cu surse complete și vecinii lor primesc contur detaliat; restul, contur grosier.
const KEEP = new Set(['FR', 'ES', 'PT', 'IT', 'DE', 'SI', 'HR', 'MD', 'AT', 'RO',
  'BE', 'LU', 'NL', 'DK', 'PL', 'CZ', 'CH', 'LI', 'MC', 'AD', 'GI', 'SM', 'VA',
  'HU', 'RS', 'BA', 'ME', 'UA', 'SK']);

// Fereastra Europei (excludem teritoriile de peste mări, ex. Guyana Franceză)
const EU = [-32, 26, 45, 72];

// Poligoane de exclus (insule fără date în sursa oficială a țării respective)
const DROP = {
  PT: (bb) => bb[2] < -10, // Azore și Madeira: DGEG acoperă doar Portugalia continentală
  RU: (bb) => bb[2] > 30, // păstrăm doar Kaliningradul (restul Rusiei nu ne interesează)
};

function ringBbox(ring) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  return [w, s, e, n];
}

// Douglas-Peucker simplu (toleranță în grade)
function simplify(points, tol) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + t * dx - px, qy = ay + t * dy - py;
      const d = qx * qx + qy * qy;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol * tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const r4 = (v) => Math.round(v * 1e4) / 1e4;
const out = {};
for (const f of fc.features) {
  const cc = ISO[f.id] || BY_NAME[f.properties.name];
  if (!cc) continue;
  const tol = KEEP.has(cc) ? 0.002 : 0.01; // detaliu fin doar lângă țările cu surse complete
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  for (const poly of polys) {
    const bb = ringBbox(poly[0]);
    if (bb[2] < EU[0] || bb[0] > EU[2] || bb[3] < EU[1] || bb[1] > EU[3]) continue;
    if (DROP[cc] && DROP[cc](bb)) continue;
    const rings = poly.map((ring) => simplify(ring, tol)).filter((ring) => ring.length >= 4)
      .map((ring) => ring.flatMap(([x, y]) => [r4(x), r4(y)]));
    if (!rings.length) continue;
    (out[cc] ||= { cc, bbox: [Infinity, Infinity, -Infinity, -Infinity], polys: [] });
    const c = out[cc];
    c.bbox = [Math.min(c.bbox[0], bb[0]), Math.min(c.bbox[1], bb[1]), Math.max(c.bbox[2], bb[2]), Math.max(c.bbox[3], bb[3])].map(r4);
    c.polys.push(rings);
  }
}
mkdirSync(new URL('../lib/data/', import.meta.url), { recursive: true });
const list = Object.values(out).sort((a, b) => a.cc.localeCompare(b.cc));
writeFileSync(new URL('../lib/data/countries.js', import.meta.url), '// Fișier generat automat – nu edita manual.\nexport default ' + JSON.stringify(list) + ';\n');
console.log('countries:', list.length, list.map((c) => c.cc).join(' '));
