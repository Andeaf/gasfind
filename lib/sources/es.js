// SPANIA — Geoportal Gasolineras, Ministerio para la Transición Ecológica y el Reto Demográfico.
// REST oficial, fără cheie; prețurile se actualizează la ~30 de minute.
// Descărcăm pe provincii (lista completă are 12 MB și durează ~20 s).
import { fetchJson, memo } from '../http.js';
import { makeStation } from '../station.js';
import { bboxIntersects, inBbox, parseNum } from '../geo.js';
import { dmyToUtc } from '../time.js';

const HOSTS = [
  'https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/',
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/',
];

// Încadrarea fiecărei provincii [sud, vest, nord, est], calculată din coordonatele stațiilor (+0,1°)
const PROVINCES = {
  '01': [42.39, -3.22, 43.25, -2.21], '02': [38.23, -2.81, 39.47, -0.86], '03': [37.77, -1.1, 38.95, 0.28],
  '04': [36.61, -3.1, 37.81, -1.65], '05': [40.04, -5.44, 41.23, -4.23], '06': [37.93, -7.27, 39.46, -4.95],
  '07': [38.62, 1.21, 40.11, 4.36], '08': [41.11, 1.41, 42.26, 2.83], '09': [41.49, -4.34, 43.26, -2.65],
  '10': [39.04, -7.34, 40.42, -5.22], '11': [35.92, -6.53, 37.03, -5.07], '12': [39.67, -0.8, 40.74, 0.57],
  '13': [38.41, -4.96, 39.51, -2.68], '14': [37.17, -5.51, 38.6, -4], '15': [42.47, -9.31, 43.78, -7.75],
  '16': [39.23, -3.14, 40.53, -1.26], '17': [41.58, 1.83, 42.53, 3.31], '18': [36.6, -4.27, 37.92, -2.27],
  '19': [40.2, -3.55, 41.31, -1.58], '20': [42.91, -2.63, 43.45, -1.65], '21': [37.04, -7.51, 38.07, -6.12],
  '22': [41.39, -0.85, 42.84, 0.66], '23': [37.32, -4.36, 38.48, -2.49], '24': [42.04, -7.01, 43.08, -4.91],
  '25': [41.27, 0.31, 42.92, 1.93], '26': [41.88, -3.11, 42.68, -1.63], '27': [42.39, -8.03, 43.78, -6.92],
  '28': [39.93, -4.43, 41.1, -3.05], '29': [36.23, -5.41, 37.28, -3.79], '30': [37.31, -2.02, 38.72, -0.62],
  '31': [41.87, -2.35, 43.41, -1], '32': [41.73, -8.35, 42.61, -6.88], '33': [43, -7.15, 43.68, -4.47],
  '34': [41.69, -5.07, 42.99, -3.98], '35': [27.66, -15.89, 29.23, -13.39], '36': [41.81, -8.98, 42.88, -7.84],
  '37': [40.28, -6.92, 41.3, -5.1], '38': [27.65, -18.11, 28.91, -16.13], '39': [42.71, -4.6, 43.57, -3.05],
  '40': [40.61, -4.8, 41.54, -3.28], '41': [36.77, -6.4, 38.04, -4.68], '42': [41.07, -3.29, 42.13, -1.83],
  '43': [40.44, 0.21, 41.64, 1.72], '44': [39.96, -1.75, 41.32, 0.31], '45': [39.28, -5.4, 40.34, -2.92],
  '46': [38.71, -1.46, 39.96, -0.01], '47': [41.08, -5.42, 42.26, -4.01], '48': [42.96, -3.25, 43.51, -2.4],
  '49': [41.07, -6.94, 42.19, -5.22], '50': [41.02, -2.1, 42.46, 0.24], '51': [35.78, -5.44, 35.99, -5.2],
  '52': [35.17, -3.05, 35.4, -2.83],
};

const PRICE_KEYS = [
  ['Precio Gasoleo A', 'diesel'],
  ['Precio Gasolina 95 E5', 'e5'],
  ['Precio Gasolina 95 E10', 'e10'],
  ['Precio Gasolina 98 E5', 'e98'],
  ['Precio Gasolina 98 E10', 'e98'],
  ['Precio Gases licuados del petróleo', 'lpg'],
  ['Precio Gasoleo Premium', 'dp'],
];

export function provincesFor([w, s, e, n]) {
  return Object.entries(PROVINCES)
    .filter(([, [ps, pw, pn, pe]]) => bboxIntersects([w, s, e, n], [pw, ps, pe, pn]))
    .map(([id]) => id);
}

export function parse(json) {
  const updated = dmyToUtc(json?.Fecha, 'Europe/Madrid');
  const out = [];
  for (const r of json?.ListaEESSPrecio || []) {
    if (r['Tipo Venta'] === 'R') continue; // doar pentru clienți restrânși (flote etc.)
    const prices = {};
    for (const [k, key] of PRICE_KEYS) {
      const v = parseNum(r[k]);
      if (v != null && prices[key] == null) prices[key] = v;
    }
    const s = makeStation({
      src: 'es', id: r.IDEESS,
      lat: parseNum(r['Latitud']), lng: parseNum(r['Longitud (WGS84)']),
      brand: r['Rótulo'], addr: r['Dirección'],
      city: [r['C.P.'], r['Localidad']].filter(Boolean).join(' '),
      cc: 'ES', cur: 'EUR', prices, updated,
      extra: r.Horario ? { hours: r.Horario } : undefined,
    });
    if (s) out.push(s);
  }
  return out;
}

async function loadProvince(id) {
  return memo(`es:${id}`, 25 * 60e3, async () => {
    let lastErr;
    for (const host of HOSTS) {
      try {
        return parse(await fetchJson(host + id, { timeout: 20000, retries: 0 }));
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  });
}

export default {
  id: 'es',
  name: 'Spania',
  cc: 'ES',
  cur: 'EUR',
  attribution: 'Ministerio para la Transición Ecológica y el Reto Demográfico – Geoportal Gasolineras',
  coverage: [[-9.5, 35.1, 4.5, 44.0], [-18.3, 27.5, -13.3, 29.4]],
  tile: [0.5, 0.5],
  ttl: 1800,
  complete: true,
  async fetchTile(bbox) {
    const ids = provincesFor(bbox);
    const results = await Promise.allSettled(ids.map(loadProvince));
    const ok = results.filter((r) => r.status === 'fulfilled');
    if (ids.length && !ok.length) throw results[0].reason;
    const stations = ok.flatMap((r) => r.value).filter((s) => inBbox(s.lat, s.lng, bbox));
    return { stations, partial: ok.length < ids.length };
  },
};
