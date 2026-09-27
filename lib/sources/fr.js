// FRANȚA — date oficiale prix-carburants.gouv.fr (Ministère de l'Économie), Licence Ouverte 2.0.
// API Opendatasoft: data.economie.gouv.fr, setul "flux instantané v2", actualizat la ~10 minute.
import { fetchJson } from '../http.js';
import { makeStation } from '../station.js';
import { localIsoToUtc } from '../time.js';

const BASE = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json';
const FIELDS = 'id,adresse,ville,cp,geom,pop,gazole_prix,gazole_maj,sp95_prix,sp95_maj,e10_prix,e10_maj,sp98_prix,sp98_maj,gplc_prix,gplc_maj,carburants_indisponibles,horaires_automate_24_24';

// câmp sursă -> cheia noastră (+ numele folosit în "carburants_indisponibles")
const MAP = [
  ['gazole', 'diesel', 'Gazole'],
  ['sp95', 'e5', 'SP95'],
  ['e10', 'e10', 'E10'],
  ['sp98', 'e98', 'SP98'],
  ['gplc', 'lpg', 'GPLc'],
];

// Numele/marca lipsesc intenționat din datele oficiale; le luăm din OpenStreetMap
// (tag-ul ref:FR:prix-carburants, © contribuitorii OpenStreetMap, ODbL).
let namesPromise;
function frNames() {
  namesPromise ||= import('../data/fr-names.js').then((m) => m.default).catch(() => ({}));
  return namesPromise;
}

export function parse(rows, names = {}) {
  const out = [];
  for (const r of rows || []) {
    const unavailable = new Set(r.carburants_indisponibles || []);
    const prices = {}, times = {};
    for (const [src, key, label] of MAP) {
      const v = r[`${src}_prix`];
      if (typeof v === 'number' && !unavailable.has(label)) {
        prices[key] = v;
        // Atenție: "*_maj" are sufixul +00:00, dar de fapt e ora Franței
        const t = localIsoToUtc(r[`${src}_maj`], 'Europe/Paris');
        if (t) times[key] = t;
      }
    }
    const [brand, name] = names[String(r.id)] || [];
    const extra = {};
    if (r.pop === 'A') extra.hw = true; // autostradă
    if (r.horaires_automate_24_24 === 'Oui') extra.h24 = true; // automat 24/24
    const s = makeStation({
      src: 'fr', id: r.id, lat: r.geom?.lat, lng: r.geom?.lon,
      brand, name,
      addr: r.adresse, city: [r.cp, r.ville].filter(Boolean).join(' '),
      cc: 'FR', cur: 'EUR', prices, times, extra,
    });
    if (s) out.push(s);
  }
  return out;
}

export default {
  id: 'fr',
  name: 'Franța',
  cc: 'FR',
  cur: 'EUR',
  attribution: 'prix-carburants.gouv.fr – Ministère de l’Économie (Licence Ouverte 2.0)',
  coverage: [[-5.3, 41.3, 9.7, 51.2]],
  tile: [0.3, 0.24],
  ttl: 600,
  complete: true,
  async fetchTile([w, s, e, n]) {
    const where = `in_bbox(geom,${s},${w},${n},${e})`;
    const url = `${BASE}?where=${encodeURIComponent(where)}&select=${encodeURIComponent(FIELDS)}&limit=-1`;
    const [rows, names] = await Promise.all([fetchJson(url, { timeout: 15000 }), frNames()]);
    return parse(rows, names);
  },
};
